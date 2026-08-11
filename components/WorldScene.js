'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { supabase } from '../lib/supabaseClient';

const WORLD_ID = 'default';

const CAT_COLORS = {
  fordon: 0x378add,
  varelse: 0xd85a30,
  byggnad: 0x888780,
  dekoration: 0x7f77dd,
  karaktar: 0xd4537e
};

const CAT_LABELS = {
  fordon: 'Fordon',
  varelse: 'Varelse',
  byggnad: 'Byggnad',
  dekoration: 'Dekoration',
  karaktar: 'Karaktär'
};

export default function WorldScene() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const placeNewBlockRef = useRef(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('fordon');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [thirdPerson, setThirdPerson] = useState(false);

  // Set up the three.js world once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd3f0);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height, false);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(5, 10, 5);
    scene.add(light);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x8fbf5a })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(40, 40, 0x5c8a3a, 0x5c8a3a);
    grid.position.y = 0.01;
    scene.add(grid);

    const avatar = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xd4537e })
    );
    body.position.y = 0.4;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf0997b })
    );
    head.position.y = 0.98;
    avatar.add(body);
    avatar.add(head);
    avatar.position.set(0, 0, 8);
    avatar.visible = false;
    scene.add(avatar);

    function addBlock(x, z, size, color) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({ color })
      );
      box.position.set(x, size / 2, z);
      scene.add(box);
      return box;
    }

    const textureLoader = new THREE.TextureLoader();

    function addImageBillboard(x, z, size, imageUrl) {
      textureLoader.load(
        imageUrl,
        (texture) => {
          const material = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(material);
          const aspect = texture.image.width / texture.image.height;
          const spriteHeight = size * 0.9;
          sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
          sprite.position.set(x, size + spriteHeight / 2 + 0.15, z);
          scene.add(sprite);
        },
        undefined,
        (err) => {
          console.error('Kunde inte ladda bild för bygge:', imageUrl, err);
        }
      );
    }

    function placeNewBlock(cat, x, z, imageUrl) {
      const size = cat === 'byggnad' ? 1.8 : cat === 'varelse' ? 1.4 : 1.1;
      addBlock(x, z, size, CAT_COLORS[cat] || 0x888780);
      if (imageUrl) {
        addImageBillboard(x, z, size, imageUrl);
      }
    }
    placeNewBlockRef.current = placeNewBlock;

    const keys = {};
    const onKeyDown = (e) => (keys[e.key.toLowerCase()] = true);
    const onKeyUp = (e) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let yaw = 0;
    const speed = 0.06;
    const turnSpeed = 0.03;
    let raf;

    function animate() {
      raf = requestAnimationFrame(animate);

      if (keys['a'] || keys['arrowleft']) yaw += turnSpeed;
      if (keys['d'] || keys['arrowright']) yaw -= turnSpeed;
      avatar.rotation.y = yaw;

      const forward = new THREE.Vector3(Math.sin(yaw) * -1, 0, Math.cos(yaw) * -1);
      if (keys['w'] || keys['arrowup']) avatar.position.addScaledVector(forward, speed);
      if (keys['s'] || keys['arrowdown']) avatar.position.addScaledVector(forward, -speed);

      avatar.position.x = Math.max(-18, Math.min(18, avatar.position.x));
      avatar.position.z = Math.max(-18, Math.min(18, avatar.position.z));

      camera.rotation.order = 'YXZ';

      if (sceneRef.current?.thirdPerson) {
        const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const camPos = avatar.position.clone().addScaledVector(back, 4);
        camPos.y = avatar.position.y + 2.2;
        camera.position.copy(camPos);
        camera.lookAt(avatar.position.x, avatar.position.y + 0.8, avatar.position.z);
      } else {
        camera.position.set(avatar.position.x, avatar.position.y + 1.6, avatar.position.z);
        camera.rotation.y = yaw;
      }

      renderer.render(scene, camera);
    }
    animate();

    sceneRef.current = { avatar, thirdPerson: false };
    sceneRef.current.teleport = (x, z) => {
      avatar.position.x = x;
      avatar.position.z = z;
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
    };
  }, []);

  // Load existing builds from Supabase and place them in the world.
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('world_id', WORLD_ID)
        .order('created_at', { ascending: true });

      if (error) {
        setStatus('Kunde inte hämta befintliga byggen: ' + error.message);
        return;
      }

      setBuilds(data || []);
      (data || []).forEach((b) => {
        placeNewBlockRef.current?.(b.category, b.pos_x, b.pos_z, b.image_url);
      });
    }
    load();
  }, []);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleAdd() {
    const buildName = name.trim() || 'Namnlöst bygge';
    setSaving(true);
    setStatus('');

    let imageUrl = null;
    let uploadFailedMessage = null;

    if (file) {
      const path = `${WORLD_ID}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('builds').upload(path, file);
      if (uploadError) {
        uploadFailedMessage = 'Bilden kunde inte laddas upp (bygget sparades ändå utan bild): ' + uploadError.message;
      } else {
        const { data: publicUrlData } = supabase.storage.from('builds').getPublicUrl(path);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    const posX = (Math.random() - 0.5) * 14;
    const posZ = (Math.random() - 0.5) * 6 - 2;

    const { data, error } = await supabase
      .from('builds')
      .insert({
        world_id: WORLD_ID,
        name: buildName,
        category,
        image_url: imageUrl,
        pos_x: posX,
        pos_z: posZ
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setStatus('Kunde inte spara bygget: ' + error.message);
      return;
    }

    placeNewBlockRef.current?.(category, posX, posZ, imageUrl);
    setBuilds((prev) => [...prev, data]);
    setStatus(uploadFailedMessage || buildName + ' är nu placerad i din värld. Gå och hitta den.');
    setName('');
    setFile(null);
    setPreviewUrl(null);
  }

  function toggleView() {
    setThirdPerson((prev) => {
      const next = !prev;
      if (sceneRef.current) {
        sceneRef.current.thirdPerson = next;
        sceneRef.current.avatar.visible = next;
      }
      return next;
    });
  }

  return (
    <div>
      <div
        style={{
          background: 'white',
          border: '1px solid #d3d1c7',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 16
        }}
      >
        <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 12px' }}>Filma eller ladda upp ditt bygge</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <label
            style={{
              width: 96,
              height: 96,
              borderRadius: 8,
              border: '1px dashed #b4b2a9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              overflow: 'hidden',
              background: '#f1efe8'
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 12, color: '#888780', textAlign: 'center', padding: 8 }}>Välj bild</span>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              placeholder="Namn på bygget, t.ex. Ninjago-draken"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button onClick={handleAdd} disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Lägger till…' : 'Lägg till i din värld'}
            </button>
          </div>
        </div>
        {status && <p style={{ fontSize: 12, color: '#5f5e5a', margin: '10px 0 0' }}>{status}</p>}
      </div>

      <div
        style={{
          background: '#f1efe8',
          borderRadius: 12,
          border: '1px solid #d3d1c7',
          padding: 12,
          overflow: 'hidden'
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: 360, display: 'block', borderRadius: 8 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <button onClick={toggleView}>{thirdPerson ? 'Byt till förstaperson' : 'Byt till tredjeperson'}</button>
        <p style={{ fontSize: 12, color: '#5f5e5a', margin: 0 }}>
          WASD eller piltangenter för att gå och vända
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 13, color: '#5f5e5a', margin: '0 0 8px' }}>Dina byggen ({builds.length})</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {builds.map((b) => (
            <div
              key={b.id}
              onClick={() => sceneRef.current?.teleport?.(b.pos_x, b.pos_z)}
              style={{
                background: 'white',
                border: '1px solid #d3d1c7',
                borderRadius: 12,
                padding: 12,
                cursor: 'pointer'
              }}
            >
              {b.image_url && (
                <img
                  src={b.image_url}
                  alt=""
                  style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                />
              )}
              <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{b.name}</p>
              <p style={{ fontSize: 12, color: '#5f5e5a', margin: '4px 0 0' }}>{CAT_LABELS[b.category]}</p>
              <p style={{ fontSize: 11, color: '#888780', margin: '6px 0 0' }}>Klicka för att gå dit</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
