use std::{
    ffi::OsStr,
    path::{Path, PathBuf},
};

pub const PROJECT_EXTENSION: &str = "scap";
pub const LEGACY_PROJECT_EXTENSION: &str = "cap";

pub fn is_project_extension(extension: &str) -> bool {
    extension.eq_ignore_ascii_case(PROJECT_EXTENSION)
        || extension.eq_ignore_ascii_case(LEGACY_PROJECT_EXTENSION)
}

pub fn is_project_path(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .is_some_and(is_project_extension)
}

pub fn is_project_file_name(name: &str) -> bool {
    strip_project_extension(name).is_some()
}

pub fn strip_project_extension(name: &str) -> Option<&str> {
    [PROJECT_EXTENSION, LEGACY_PROJECT_EXTENSION]
        .into_iter()
        .find_map(|extension| {
            let split = name.len().checked_sub(extension.len() + 1)?;
            let suffix = name.get(split..)?;
            let (dot, tail) = suffix.split_at(1);
            (dot == "." && tail.eq_ignore_ascii_case(extension)).then(|| &name[..split])
        })
}

pub fn strip_project_extension_or_self(name: &str) -> &str {
    strip_project_extension(name).unwrap_or(name)
}

pub fn project_file_name(stem: &str) -> String {
    format!("{stem}.{PROJECT_EXTENSION}")
}

pub fn project_path_in(dir: &Path, stem: &str) -> PathBuf {
    dir.join(project_file_name(stem))
}

pub fn project_ancestor(path: &Path) -> Option<&Path> {
    path.ancestors().find(|ancestor| is_project_path(ancestor))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognises_both_extensions() {
        assert!(is_project_path(Path::new("/r/Demo.scap")));
        assert!(is_project_path(Path::new("/r/Demo.cap")));
        assert!(is_project_path(Path::new("/r/Demo.SCAP")));
        assert!(!is_project_path(Path::new("/r/Demo.mp4")));
        assert!(!is_project_path(Path::new("/r/scap")));
        assert!(!is_project_path(Path::new("/r/Demo.capx")));
    }

    #[test]
    fn recognises_file_names() {
        assert!(is_project_file_name("a.scap"));
        assert!(is_project_file_name("a.cap"));
        assert!(!is_project_file_name("a.mp4"));
        assert!(!is_project_file_name(".cap-export-x"));
        assert!(!is_project_file_name("cap"));
    }

    #[test]
    fn strips_either_extension() {
        assert_eq!(strip_project_extension("My Rec.scap"), Some("My Rec"));
        assert_eq!(strip_project_extension("My Rec.cap"), Some("My Rec"));
        assert_eq!(strip_project_extension("My Rec"), None);
        assert_eq!(strip_project_extension_or_self("My Rec"), "My Rec");
        assert_eq!(strip_project_extension_or_self("a.b.scap"), "a.b");
    }

    #[test]
    fn new_projects_use_scap() {
        assert_eq!(project_file_name("Demo"), "Demo.scap");
        assert_eq!(
            project_path_in(Path::new("/r"), "Demo"),
            PathBuf::from("/r/Demo.scap")
        );
    }

    #[test]
    fn finds_project_ancestor_for_both() {
        assert_eq!(
            project_ancestor(Path::new("/r/a.scap/screenshots/x.png")),
            Some(Path::new("/r/a.scap"))
        );
        assert_eq!(
            project_ancestor(Path::new("/r/a.cap/screenshots/x.png")),
            Some(Path::new("/r/a.cap"))
        );
        assert_eq!(project_ancestor(Path::new("/r/a/x.png")), None);
    }
}
