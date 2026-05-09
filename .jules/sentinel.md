## 2024-05-24 - Path Traversal in AI Model Loading
**Vulnerability:** Arbitrary file loading via `modelPath` in `hailo_service.py` API parameters
**Learning:** Security policy for file path validation in Python services needs careful path resolution because simple substring matching can be bypassed with `../` characters, which could allow users to load arbitrary `.hef` files or potentially trigger unintended behaviors if parsing vulnerabilities exist.
**Prevention:** Use `os.path.realpath()` to resolve symlinks and `os.path.commonpath()` to strictly ensure the resolved requested path resides entirely within a whitelisted directory tree before passing it to file system operations.

## 2024-05-24 - Path Traversal in Secondary File Inputs
**Vulnerability:** Arbitrary file loading via `imagePath` in `hailo_service.py` API parameters leading to arbitrary file reads when preprocessing images.
**Learning:** Security validation must be consistently applied to all user-controlled file paths. Even if primary paths (like `modelPath`) are validated, missing validation on secondary inputs (like `imagePath`) creates a path traversal vulnerability.
**Prevention:** Implement comprehensive path validation helper functions (`_is_safe_image_path`) for all paths using `os.path.realpath()` and `os.path.commonpath()`, and apply them rigorously before any filesystem operation (like `Image.open()`).

## 2024-05-24 - Information Exposure via Error Messages
**Vulnerability:** Leaking raw database or internal server error messages (`error.message`) to the frontend in `useHailoModels.ts` and from the edge function in `hailo-inference/index.ts`.
**Learning:** Returning raw error messages from backend services or directly rendering raw database errors in the UI can expose sensitive information such as database schemas, internal paths, or unhandled exception details, which violates the "Fail Securely" principle.
**Prevention:** Always sanitize error messages. Log detailed error traces internally (`console.error` server-side or frontend console for debugging) but return generic, user-friendly error strings to the client or UI to prevent information disclosure.
## 2025-05-24 - Missing Authorization Check on Edge Functions
**Vulnerability:** Supabase edge functions not enforcing authentication via the Authorization header, allowing anonymous API access.
**Learning:** Edge functions are inherently publicly accessible unless explicitly secured. Supabase edge functions generated via Deno.serve must manually validate the Authorization header if the endpoint handles sensitive tasks (like running inferences).
**Prevention:** Always extract and validate the `req.headers.get('Authorization')` early in the edge function lifecycle before processing any business logic.

## 2025-05-24 - Input Validation for File Uploads
**Vulnerability:** User-provided `file.name` string in the frontend directly interpolated into a database path field (`/uploaded/models/${file.name}`).
**Learning:** Even though modern browsers sanitize file names, relying on client-side state without explicit sanitization creates a defense-in-depth vulnerability, as attackers can bypass the browser and inject path traversal characters via direct API calls.
**Prevention:** Apply a strict regex allowlist sanitization (`file.name.replace(/[^a-zA-Z0-9.-]/g, '_')`) to all user-provided file names before they are used to generate paths or database identifiers.

## 2026-05-09 - Missing Authentication Validation on Edge Functions
**Vulnerability:** The Supabase Edge Function `hailo-inference` lacked explicit authentication validation, allowing unauthenticated and anonymous execution of inference tasks via the `/run-inference` endpoint.
**Learning:** Supabase Edge Functions created with `Deno.serve` do not automatically authenticate requests. A missing authentication check means anyone can invoke the API, potentially leading to unauthorized resource consumption (running inferences) or data access.
**Prevention:** Always cryptographically verify the incoming token using `supabase.auth.getUser(token)` within the edge function handler. Simply checking for the presence of the `Authorization` header is insufficient; the token itself must be verified to ensure it represents a valid, authenticated user.
