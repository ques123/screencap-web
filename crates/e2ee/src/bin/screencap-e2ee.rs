use cap_e2ee::{ContentKey, decrypt_object, encrypt_object};
use std::{env, fs, process::ExitCode};

const USAGE: &str = "usage:
  screencap-e2ee keygen
  screencap-e2ee fingerprint <key>
  screencap-e2ee encrypt --key <key> --subpath <subpath> <input> <output>
  screencap-e2ee decrypt --key <key> --subpath <subpath> <input> <output>";

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match run(&args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("screencap-e2ee: {message}");
            ExitCode::FAILURE
        }
    }
}

fn run(args: &[String]) -> Result<(), String> {
    let (command, rest) = args.split_first().ok_or(USAGE)?;
    match command.as_str() {
        "keygen" => {
            let key = ContentKey::generate();
            println!("{}", key.to_base64url());
            Ok(())
        }
        "fingerprint" => {
            let [text] = rest else {
                return Err(USAGE.into());
            };
            let key = ContentKey::from_base64url(text).map_err(|e| e.to_string())?;
            println!("{}", key.fingerprint());
            Ok(())
        }
        "encrypt" | "decrypt" => {
            let mut key = None;
            let mut subpath = None;
            let mut files = Vec::new();
            let mut iter = rest.iter();
            while let Some(arg) = iter.next() {
                match arg.as_str() {
                    "--key" => key = Some(iter.next().ok_or(USAGE)?),
                    "--subpath" => subpath = Some(iter.next().ok_or(USAGE)?),
                    _ => files.push(arg),
                }
            }
            let (Some(key), Some(subpath), [input, output]) = (key, subpath, files.as_slice())
            else {
                return Err(USAGE.into());
            };
            let key = ContentKey::from_base64url(key).map_err(|e| e.to_string())?;
            let data = fs::read(input).map_err(|e| format!("reading {input}: {e}"))?;
            let result = if command == "encrypt" {
                encrypt_object(&key, subpath, &data)
            } else {
                decrypt_object(&key, subpath, &data).map_err(|e| e.to_string())?
            };
            fs::write(output, result).map_err(|e| format!("writing {output}: {e}"))
        }
        _ => Err(USAGE.into()),
    }
}
