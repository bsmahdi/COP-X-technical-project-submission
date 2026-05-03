# Getting Started — CLI

Scriptable terminal interface to the optimizer. Useful for batch jobs,
piping output into other tools, and offline use without running a server.

## Prerequisites

- Node.js 18 or newer
- An OpenAI API key

## Install

From the repository root:

```bash
npm install
cp .env.example .env
# then edit .env and set OPENAI_API_KEY=sk-...
```

## Two commands

```bash
node cli.js shorten   <input>   [options]
node cli.js summarize <input>   [options]
```

`<input>` is either a file path or a raw string.

### Options

| Flag                     | Effect                                                       |
| ------------------------ | ------------------------------------------------------------ |
| `-o, --output <path>`    | Save the result to a file                                    |
| `-v, --verify` *(shorten only)* | After compression, run the strong model on the result and print its answer |
| `-s, --silent`           | Print only the result text — useful for piping              |

## Example: `shorten`

Input: a 5,144-token prompt asking *"why is my endpoint not responding?"*
with a full Docker log dump attached
([`prompt examples/prompts/prompt example.txt`](../../prompt%20examples/prompts)).

```bash
$ node cli.js shorten "./prompt examples/prompts/prompt example.txt"

--- Prompt Compression ---
Original tokens: 5144
Processing...

Optimized Prompt:
-----------------
**Issue:** Endpoint not responding.

**Logs:**
1. **CV PDF Service**: Listening on `http://0.0.0.0:5005`, received request to `/render`, responded with `200`.
2. **Backend Service**: Started successfully, mapped routes.
3. **CORS Error**: `Not allowed by CORS` at `/app/dist/main.js:27:26`.
4. **Database Errors**: Multiple `ERROR: column cv_submissions.revision does not exist`.

**Recommendations:**
- Check CORS configuration in the backend.
- Verify database schema for `cv_submissions` to ensure `revision` column exists.
-----------------
Optimized tokens: 132 (2.57%)
Optimization cost: $0.001162
```

That is **97.4 % fewer tokens** for one cent's worth of preprocessing.

## Example: `summarize`

Input: a 4,768-token chat transcript about an LDAP integration
([`prompt examples/convos/convo example.txt`](../../prompt%20examples/convos)).

```bash
$ node cli.js summarize "./prompt examples/convos/convo example.txt"

--- Conversation Summarization ---
Original tokens: 4768
Processing...

Bootstrap Summary:
------------------
**Bootstrap Summary:**

1. **Core Problem:** The user is trying to integrate LDAP with a pfSense router for central user management, but group membership queries are not returning expected results due to misconfiguration in LDAP attributes and object classes.

2. **Current Environment:**
   - LDAP Server: OpenLDAP
   - Base DN: `dc=demo,dc=local`
   - User and Group OUs: `ou=people` and `ou=groups`
   - Group Object Class: `groupOfNames`
   - User Object Class: `inetOrgPerson` (to be used for new users)

3. **What Has Been Tried:**
   - Verified group and user attributes via LDAP search.
   - Confirmed `testuser` is in the `VPN-Users` group.
   - Hit a "GID Number" error when creating a user with the wrong template.

4. **Exact Next Step:**
   - Create user `mahdi` using the `inetOrgPerson` template, then add it to `VPN-Users`.

5. **Critical Secrets/IDs:**
   - Bind DN: `cn=admin,dc=demo,dc=local`
   - User DN: `uid=mahdi,ou=people,dc=demo,dc=local`
   - Group DN: `cn=VPN-Users,ou=groups,dc=demo,dc=local`
------------------
Summary tokens: 370 (7.76%)
Cost: $0.001061
```

The summary is the right size to paste as the first message of a fresh chat
without losing state.

## Piping (`--silent`)

The `--silent` flag emits only the result text, so you can chain it:

```bash
# Replace the contents of a file with its compressed version
node cli.js shorten ./prompt.txt -s > ./prompt.short.txt

# Read from stdin via xargs
cat ./prompt.txt | xargs -I {} node cli.js shorten "{}" -s
```

## Verifying compressed output (`--verify`)

`--verify` runs the strong model on the compressed prompt to confirm it
still produces a valid answer. This costs more (it actually invokes the
expensive model) but is useful when calibrating.

```bash
node cli.js shorten "./prompt examples/prompts/prompt example.txt" -v
```

## Batch mode

Process every `.txt` under `prompt examples/` and write outputs to
`output/`:

```bash
npm run test-batch
```

This runs both functions across the whole reference corpus and prints a
per-file token reduction and savings table. Use it as a smoke test that
the optimizer is producing expected savings.
