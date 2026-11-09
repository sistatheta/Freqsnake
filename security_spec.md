# Security Specification for Freq Snake Global Leaderboard

## 1. Data Invariants
1. `name` must be a string between 1 and 5 characters containing alphanumeric arcade characters (`^[A-Z0-9_-]{1,5}$`).
2. `score` must be a non-negative integer number (`score >= 0`).
3. `createdAt` must strictly match the server timestamp (`request.time`).
4. Leaderboard documents are append-only public records: updates and deletes are disabled to prevent score tampering.
5. Anyone can read the global top scores without authentication. Anyone can submit a score, provided it satisfies strict schema validation.

## 2. The Dirty Dozen Payloads
1. **Empty Name**: `{ "name": "", "score": 100, "createdAt": "request.time" }` -> Reject (minLength: 1).
2. **Name Over 5 Characters**: `{ "name": "TOOLONG", "score": 100, "createdAt": "request.time" }` -> Reject (maxLength: 5).
3. **Negative Score**: `{ "name": "ACE", "score": -5, "createdAt": "request.time" }` -> Reject (score >= 0).
4. **Non-numeric Score**: `{ "name": "ACE", "score": "one_million", "createdAt": "request.time" }` -> Reject (score is number).
5. **Client Fake Timestamp**: `{ "name": "ACE", "score": 50, "createdAt": "1999-01-01T00:00:00Z" }` -> Reject (createdAt == request.time).
6. **Ghost Field Injection**: `{ "name": "ACE", "score": 50, "createdAt": "request.time", "isAdmin": true }` -> Reject (hasOnly required keys).
7. **Missing Score Field**: `{ "name": "ACE", "createdAt": "request.time" }` -> Reject (hasAll required keys).
8. **Missing Name Field**: `{ "score": 50, "createdAt": "request.time" }` -> Reject (hasAll required keys).
9. **Tamper Update Score**: Attempt to update an existing leaderboard document's score -> Reject (`allow update: if false`).
10. **Malicious Delete**: Attempt to delete another player's high score document -> Reject (`allow delete: if false`).
11. **Excessive Score Overflow**: Score exceeding max arcade boundary (`score > 100000`) -> Reject.
12. **Giant ID Path Injection**: Attempting to write with document ID exceeding 128 characters or illegal characters -> Reject (`isValidId(scoreId)`).
