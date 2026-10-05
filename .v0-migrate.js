const fs = require('fs')
const { Client } = require('/tmp/dbrun/node_modules/pg')

async function main() {
  const url = (process.env.POSTGRES_URL_NON_POOLING || '').replace(/[?&]sslmode=[^&]*/, '')
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const existing = await client.query(
    "select table_name from information_schema.tables where table_schema='public' and table_name in ('campuses','profiles','posts')"
  )
  if (existing.rows.length) {
    console.log('Tables already exist:', existing.rows.map((r) => r.table_name).join(', '))
    await client.end()
    return
  }
  const sql = fs.readFileSync('/vercel/share/v0-project/supabase/schema.sql', 'utf8')
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
    console.log('Schema applied')
  } catch (e) {
    await client.query('rollback')
    console.error('Failed:', e.message)
    process.exitCode = 1
  }
  const check = await client
    .query(
      "select (select count(*) from public.campuses) as campuses, (select count(*) from information_schema.tables where table_schema='public') as tables"
    )
    .catch((e) => ({ rows: [{ error: e.message }] }))
  console.log(check.rows[0])
  await client.end()
}
main()
