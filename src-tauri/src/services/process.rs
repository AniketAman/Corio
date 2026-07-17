use std::process::{Command, Stdio};

pub struct StreamOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

pub fn run_command(program: &str, args: &[&str], cwd: Option<&str>) -> Result<StreamOutput, String> {
    let path_env = std::env::var("PATH").unwrap_or_default();
    let home = std::env::var("HOME").unwrap_or_default();
    let extended_path = format!("{}/.superset/bin:{}/.local/bin:{}/.cargo/bin:/usr/local/bin:/opt/homebrew/bin:{}", home, home, home, path_env);

    let mut cmd = Command::new(program);
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("PATH", &extended_path);

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd.output()
        .map_err(|e| format!("Failed to execute {}: {}", program, e))?;

    Ok(StreamOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
