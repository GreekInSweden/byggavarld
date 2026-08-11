import WorldScene from '../components/WorldScene';

export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Min värld</h1>
      <p style={{ fontSize: 14, color: '#5f5e5a', marginTop: 0, marginBottom: 24 }}>
        Filma eller fota ett bygge, lägg till det i din värld, och gå runt och hitta det.
      </p>
      <WorldScene />
    </main>
  );
}
