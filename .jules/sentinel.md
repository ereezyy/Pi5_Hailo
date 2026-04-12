## 2024-05-24 - Path Traversal in AI Model Loading
**Vulnerability:** Arbitrary file loading via `modelPath` in `hailo_service.py` API parameters
**Learning:** Security policy for file path validation in Python services needs careful path resolution because simple substring matching can be bypassed with `../` characters, which could allow users to load arbitrary `.hef` files or potentially trigger unintended behaviors if parsing vulnerabilities exist.
**Prevention:** Use `os.path.realpath()` to resolve symlinks and `os.path.commonpath()` to strictly ensure the resolved requested path resides entirely within a whitelisted directory tree before passing it to file system operations.


## 2024-10-18 - Path Traversal in Image Loading
**Vulnerability:** Arbitrary file loading via `imagePath` in `hailo_service.py` API parameters using absolute paths.
**Learning:** `os.path.realpath` alone without a directory constraint does not prevent access via absolute paths like `/etc/passwd`. It is crucial to anchor user-provided paths to an allowed base directory (e.g., `/tmp`, or an application upload folder) using `os.path.commonpath`. Returning standard JSON error payloads on failure is cleaner and safer than mutating the path to a dummy non-existent file.
**Prevention:** Combine `os.path.realpath()` with `os.path.commonpath([base_dir, requested]) == base_dir` to ensure the final resolved path stays within a safe, designated directory. Return a clear `{"success": False, "error": "Invalid or unauthorized image path"}` payload when validation fails.
