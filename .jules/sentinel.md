## 2024-05-24 - Path Traversal in AI Model Loading
**Vulnerability:** Arbitrary file loading via `modelPath` in `hailo_service.py` API parameters
**Learning:** Security policy for file path validation in Python services needs careful path resolution because simple substring matching can be bypassed with `../` characters, which could allow users to load arbitrary `.hef` files or potentially trigger unintended behaviors if parsing vulnerabilities exist.
**Prevention:** Use `os.path.realpath()` to resolve symlinks and `os.path.commonpath()` to strictly ensure the resolved requested path resides entirely within a whitelisted directory tree before passing it to file system operations.

## 2024-05-24 - Path Traversal in Secondary File Inputs
**Vulnerability:** Arbitrary file loading via `imagePath` in `hailo_service.py` API parameters leading to arbitrary file reads when preprocessing images.
**Learning:** Security validation must be consistently applied to all user-controlled file paths. Even if primary paths (like `modelPath`) are validated, missing validation on secondary inputs (like `imagePath`) creates a path traversal vulnerability.
**Prevention:** Implement comprehensive path validation helper functions (`_is_safe_image_path`) for all paths using `os.path.realpath()` and `os.path.commonpath()`, and apply them rigorously before any filesystem operation (like `Image.open()`).
