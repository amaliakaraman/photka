# ai chatbot setup

quick guide to get support chat working

## get your openai api key

1. go to https://platform.openai.com + log in
3. click your profile icon → "api keys"
4. click "create new secret key"
5. name it something like "photka support bot"
6. copy it immediately (starts with `sk-` and you only see it once)

## get your supabase service role key

1. go to https://supabase.com/dashboard
2. select your photka project
3. settings → api
4. scroll to "project api keys"
5. find the **service_role** key (not the anon key)
6. click the eye icon to reveal it
7. copy it (long string starting with `eyJ`)

⚠️ don't share the service_role key or commit it to github

## add environment variables

create or edit `.env.local` in your project root:

```env
OPENAI_API_KEY=sk-your-actual-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJ-your-actual-service-role-key-here
```

replace with your actual keys and save.

## update supabase rls policy

1. go to supabase dashboard → sql editor
2. new query
3. paste this:

```sql
-- allow ai support messages to be readable
-- ai uses special uuid: 00000000-0000-0000-0000-000000000001
CREATE POLICY "Allow AI support messages"
  ON messages FOR SELECT
  USING (
    sender_id = '00000000-0000-0000-0000-000000000001'::uuid 
    OR receiver_id = auth.uid()
  );
```

4. run it

## restart dev server

stop your server (ctrl+c) and start it again:

```bash
npm run dev
```

## test it

1. open the app (localhost:3000)
2. log in
3. go to messages tab
4. click the message icon → "photka - support team"
5. send a message like "how much does an iphone session cost?"
6. should get an ai response

## troubleshooting

**"failed to get ai response"**
- check `OPENAI_API_KEY` is in `.env.local`
- restart dev server
- verify key starts with `sk-`

**"error saving ai message"**
- check `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`
- make sure you ran the sql policy update
- verify it's the service_role key, not the anon key

**nothing happening**
- check browser console + terminal for errors
- make sure you have openai credits

## next steps

once it's working:
- customize the system prompt in `app/api/chat/route.ts`
- adjust the ai's tone/personality
- add more context about your business
