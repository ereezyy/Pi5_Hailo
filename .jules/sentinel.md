## 2024-05-24 - Path Traversal in AI Model Loading
**Vulnerability:** Arbitrary file loading via `modelPath` in `hailo_service.py` API parameters
**Learning:** Security policy for file path validation in Python services needs careful path resolution because simple substring matching can be bypassed with `../` characters, which could allow users to load arbitrary `.hef` files or potentially trigger unintended behaviors if parsing vulnerabilities exist.
**Prevention:** Use `os.path.realpath()` to resolve symlinks and `os.path.commonpath()` to strictly ensure the resolved requested path resides entirely within a whitelisted directory tree before passing it to file system operations.
