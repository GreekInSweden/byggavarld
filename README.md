# Min värld – testprototyp

En första körbar version av "filma bygge → dyker upp i din värld"-flödet.
Ingen riktig bildigenkänning ännu – du väljer själv kategori när du lägger
till ett bygge. Byggena sparas i Supabase så de finns kvar mellan besök.

## 1. Skapa Supabase-projekt

1. Gå till supabase.com och skapa ett nytt projekt (eller använd ett befintligt, men separat från Kan Du Alla).
2. Öppna SQL Editor och kör innehållet i `supabase/schema.sql`.
3. Gå till Storage och skapa en bucket som heter `builds`, markerad som public.
4. Gå till Project settings > API och kopiera Project URL och anon public key.

## 2. Koppla lokalt

1. Kopiera `.env.local.example` till `.env.local`.
2. Fyll i din Supabase URL och anon-nyckel.
3. Kör:
   ```
   npm install
   npm run dev
   ```
4. Öppna http://localhost:3000

## 3. Lägg upp på GitHub

1. Skapa ett nytt repo på GitHub, t.ex. `legovarld`.
2. Dra in hela den här mappen (utan `node_modules`) precis som du gör med Kan Du Alla.

## 4. Deploya på Vercel

1. Importera repot i Vercel.
2. Under Environment Variables, lägg till samma två variabler som i `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Du får en riktig länk du kan öppna på vilken dator eller mobil som helst.

## Att veta

- RLS-policyn i `supabase/schema.sql` är öppen (ingen inloggning krävs) eftersom
  det här bara är till för dig och din son att testa. Innan fler personer
  ska kunna använda det bör den låsas till world_id/ägare, på samma sätt som
  ni gjorde säkerhetsöversynen i Kan Du Alla.
- Alla som testar just nu delar samma värld (`world_id = 'default'`).
  Separata, ägda världar per person är ett senare steg som kräver inloggning.
- Rörelsen är enkel WASD/piltangenter utan kollision – man kan gå genom
  blocken. Det är nästa naturliga förbättring om känslan är rätt.
