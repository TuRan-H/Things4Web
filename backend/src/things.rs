use std::path::{Path, PathBuf};
use tokio::process::Command;

use crate::models::{
    CreateTaskPayload, JxaResponse, ListInfo, RefreshParams, Task, TaskQueryParams,
};

const SCRIPT_LIST_LISTS: &str = include_str!("../scripts/list_lists.js");
const SCRIPT_LIST_TASKS: &str = include_str!("../scripts/list_tasks.js");
const SCRIPT_REFRESH: &str = include_str!("../scripts/refresh.js");
const SCRIPT_COMPLETE_TASK: &str = include_str!("../scripts/complete_task.js");
const SCRIPT_CREATE_TASK: &str = include_str!("../scripts/create_task.js");

fn resolve_or_extract_script(name: &str, content: &str) -> Result<PathBuf, String> {
    // 1. Check relative to current working directory
    let candidates = [
        format!("backend/scripts/{name}"),
        format!("scripts/{name}"),
        format!("../backend/scripts/{name}"),
    ];

    for path_str in &candidates {
        let p = Path::new(path_str);
        if p.exists() {
            return Ok(p.to_path_buf());
        }
    }

    // 2. If not found on disk, write embedded script to temporary directory
    let temp_dir = std::env::temp_dir().join("things_web_scripts");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create script temp directory: {e}"))?;
    let script_file = temp_dir.join(name);
    std::fs::write(&script_file, content)
        .map_err(|e| format!("Failed to write embedded script to {:?}: {e}", script_file))?;

    Ok(script_file)
}

pub async fn list_lists() -> Result<Vec<ListInfo>, (axum::http::StatusCode, String)> {
    let script_path = resolve_or_extract_script("list_lists.js", SCRIPT_LIST_LISTS)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let output = Command::new("osascript")
        .arg("-l")
        .arg("JavaScript")
        .arg(script_path)
        .output()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to execute osascript: {e}"),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("list_lists script failed: {stderr}"),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lists: Vec<ListInfo> = serde_json::from_str(stdout.trim()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse list_lists output: {e}, raw: {stdout}"),
        )
    })?;

    Ok(lists)
}

pub async fn list_tasks(
    params: TaskQueryParams,
) -> Result<Vec<Task>, (axum::http::StatusCode, String)> {
    let script_path = resolve_or_extract_script("list_tasks.js", SCRIPT_LIST_TASKS)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let arg_json = serde_json::to_string(&serde_json::json!({
        "listName": params.list_name,
        "listId": params.list_id,
        "status": params.status,
    }))
    .map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            format!("Invalid JSON query payload: {e}"),
        )
    })?;

    let output = Command::new("osascript")
        .arg("-l")
        .arg("JavaScript")
        .arg(script_path)
        .arg(arg_json)
        .output()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to execute osascript: {e}"),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("list_tasks script failed: {stderr}"),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let resp: JxaResponse<Vec<Task>> = serde_json::from_str(stdout.trim()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse list_tasks output: {e}, raw: {stdout}"),
        )
    })?;

    if resp.ok {
        Ok(resp.data.unwrap_or_default())
    } else {
        let err_msg = resp
            .error
            .map(|err| format!("{}: {}", err.code, err.message))
            .unwrap_or_else(|| "Unknown JXA script error".to_string());
        Err((axum::http::StatusCode::BAD_REQUEST, err_msg))
    }
}

pub async fn refresh_things(
    params: RefreshParams,
) -> Result<serde_json::Value, (axum::http::StatusCode, String)> {
    let script_path = resolve_or_extract_script("refresh.js", SCRIPT_REFRESH)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let arg_json = serde_json::to_string(&serde_json::json!({
        "relaunch": params.relaunch.unwrap_or(false),
    }))
    .unwrap_or_else(|_| "{}".to_string());

    let output = Command::new("osascript")
        .arg("-l")
        .arg("JavaScript")
        .arg(script_path)
        .arg(arg_json)
        .output()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to execute osascript: {e}"),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("refresh script failed: {stderr}"),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let resp: JxaResponse<serde_json::Value> =
        serde_json::from_str(stdout.trim()).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to parse refresh output: {e}, raw: {stdout}"),
            )
        })?;

    if resp.ok {
        Ok(resp
            .data
            .unwrap_or(serde_json::json!({ "refreshed": true })))
    } else {
        let err_msg = resp
            .error
            .map(|err| format!("{}: {}", err.code, err.message))
            .unwrap_or_else(|| "Unknown JXA script error".to_string());
        Err((axum::http::StatusCode::BAD_REQUEST, err_msg))
    }
}

pub async fn complete_task(
    id: &str,
    status: Option<&str>,
) -> Result<Task, (axum::http::StatusCode, String)> {
    let script_path = resolve_or_extract_script("complete_task.js", SCRIPT_COMPLETE_TASK)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let arg_json = serde_json::to_string(&serde_json::json!({
        "id": id,
        "status": status.unwrap_or("completed"),
    }))
    .map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            format!("Invalid JSON payload: {e}"),
        )
    })?;

    let output = Command::new("osascript")
        .arg("-l")
        .arg("JavaScript")
        .arg(script_path)
        .arg(arg_json)
        .output()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to execute osascript: {e}"),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("complete_task script failed: {stderr}"),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let resp: JxaResponse<Task> = serde_json::from_str(stdout.trim()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse complete_task output: {e}, raw: {stdout}"),
        )
    })?;

    if resp.ok {
        resp.data.ok_or_else(|| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Empty task data".into(),
            )
        })
    } else {
        let err_msg = resp
            .error
            .map(|err| format!("{}: {}", err.code, err.message))
            .unwrap_or_else(|| "Unknown JXA script error".to_string());
        Err((axum::http::StatusCode::BAD_REQUEST, err_msg))
    }
}

pub async fn create_task(
    payload: CreateTaskPayload,
) -> Result<Task, (axum::http::StatusCode, String)> {
    if payload.name.trim().is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            "Task title cannot be empty".to_string(),
        ));
    }

    let script_path = resolve_or_extract_script("create_task.js", SCRIPT_CREATE_TASK)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let arg_json = serde_json::to_string(&payload).map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            format!("Invalid JSON payload: {e}"),
        )
    })?;

    let output = Command::new("osascript")
        .arg("-l")
        .arg("JavaScript")
        .arg(script_path)
        .arg(arg_json)
        .output()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to execute osascript: {e}"),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("create_task script failed: {stderr}"),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let resp: JxaResponse<Task> = serde_json::from_str(stdout.trim()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse create_task output: {e}, raw: {stdout}"),
        )
    })?;

    if resp.ok {
        resp.data.ok_or_else(|| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Empty task data".into(),
            )
        })
    } else {
        let err_msg = resp
            .error
            .map(|err| format!("{}: {}", err.code, err.message))
            .unwrap_or_else(|| "Unknown JXA script error".to_string());
        Err((axum::http::StatusCode::BAD_REQUEST, err_msg))
    }
}
