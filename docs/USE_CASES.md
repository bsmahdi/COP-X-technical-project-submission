# Use Cases

COP-X exposes two functions. They solve two different cost problems and
should be used in different situations.

---

## Function 1 — `shorten`: compress a long one-shot prompt

### When to use it

You have a single, oversized prompt you are about to send to a strong model.
The instruction itself is small, but you have pasted along with it:

- complete log files,
- full stack traces,
- container output,
- environment dumps,
- documentation excerpts,
- or repetitive setup instructions.

### What it does

Sends the input through a cheap model with a system prompt that forces it to
**keep technical fidelity** (specific values, error codes, architecture
details) while **removing fluff** (greetings, repetition, explanation). The
output is the same instruction in terse technical shorthand.

### Real example

A 5,144-token prompt — the question was *"why is one of my endpoints not
responding?"* with a Docker log dump pasted underneath.

After `shorten`:

```
**Issue:** Endpoint not responding.

**Logs:**
1. **CV PDF Service**: Listening on `http://0.0.0.0:5005`, received request
   to `/render`, responded with `200`.
2. **Backend Service**: Started successfully, mapped routes.
3. **CORS Error**: `Not allowed by CORS` at `/app/dist/main.js:27:26`.
4. **Database Errors**: Multiple
   `ERROR: column cv_submissions.revision does not exist`.

**Recommendations:**
- Check CORS configuration in the backend.
- Verify database schema for `cv_submissions` to ensure `revision` column
  exists.
```

**Result:** 5,144 → 132 tokens (97.4 % reduction). Sent to the strong model,
the compressed version produces the same diagnostic answer as the original.

Full input/output is in [`prompt examples/prompts/`](../prompt%20examples/prompts)
and [`output/prompts/`](../output/prompts).

---

## Function 2 — `summarize`: continue a long conversation in a fresh chat

### When to use it

You are mid-conversation with an LLM, and the chat has gotten long.
Every new message is now expensive because the model has to reread
everything you said an hour ago. You want to keep going *without* paying
that overhead and *without* losing where you are.

### What it does

Reads the entire transcript and produces a structured **Bootstrap Summary**:

1. **Core problem** being solved
2. **Current environment** (OS, versions, stack)
3. **What has been tried** (and what failed)
4. **Exact next step** the user was about to take
5. **Critical IDs / secrets** (masked if real)

You then open a fresh chat, paste the summary as the first message, and the
new session picks up exactly where the old one left off — at the input cost
of a few hundred tokens instead of several thousand.

### Real example

A 4,768-token conversation about integrating LDAP with a pfSense router.

After `summarize`:

```
**Bootstrap Summary:**

1. **Core Problem:** The user is trying to integrate LDAP with a pfSense
   router for central user management, but group membership queries are
   not returning expected results due to misconfiguration in LDAP attributes
   and object classes.

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
   - Create user `mahdi` using the `inetOrgPerson` template, then add it
     to `VPN-Users`.

5. **Critical Secrets/IDs:**
   - Bind DN: `cn=admin,dc=demo,dc=local`
   - User DN: `uid=mahdi,ou=people,dc=demo,dc=local`
   - Group DN: `cn=VPN-Users,ou=groups,dc=demo,dc=local`
```

**Result:** 4,768 → 370 tokens (92.2 % reduction). Pasted into a new chat,
this is enough for any model to continue without re-asking what was tried.

Full transcript is in [`prompt examples/convos/`](../prompt%20examples/convos)
and [`output/convos/`](../output/convos).

---

## Decision rule

| Situation | Use |
| --- | --- |
| Single prompt feels too long for the question being asked | **`shorten`** |
| Chat has been running for a while and replies feel slower / more expensive | **`summarize`** then start a new chat |
| You don't know which → measure first | Web UI shows token counts before you click |
