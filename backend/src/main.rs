mod models;
mod things;

use axum::{extract::Query, http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::models::{RefreshParams, TaskQueryParams};

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn get_lists() -> Result<impl IntoResponse, (StatusCode, String)> {
    let lists = things::list_lists().await?;
    Ok(Json(lists))
}

async fn get_tasks(
    Query(params): Query<TaskQueryParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let tasks = things::list_tasks(params).await?;
    Ok(Json(tasks))
}

async fn post_refresh(
    payload: Option<Json<RefreshParams>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let params = payload.map(|Json(p)| p).unwrap_or_default();
    let result = things::refresh_things(params).await?;
    Ok(Json(result))
}

pub fn create_app() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/healthz", get(health_check))
        .route("/api/v1/lists", get(get_lists))
        .route("/api/v1/tasks", get(get_tasks))
        .route("/api/v1/refresh", axum::routing::post(post_refresh))
        .layer(cors)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let app = create_app();

    println!("ThingsWeb backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind port");
    axum::serve(listener, app).await.expect("Server error");
}

#[cfg(test)]
mod tests {
    use crate::models::{ListInfo, Task};

    #[test]
    fn maps_open_task_json() {
        let sample_json = r#"{
            "id": "AuveBWEBx14WC5Xuurb1yf",
            "name": "continous batch",
            "status": "open",
            "notes": "notes content",
            "projectId": "6LZSFCcw7zge5p6mjmuZjM",
            "projectName": "ML",
            "areaId": null,
            "areaName": null,
            "tags": ["重要"],
            "dueDate": null,
            "activationDate": "2026-09-10",
            "completionDate": null,
            "cancellationDate": null,
            "creationDate": "2026-09-02T01:08:56.000Z",
            "modificationDate": "2026-09-22T13:27:31.000Z"
        }"#;

        let task: Task = serde_json::from_str(sample_json).expect("Failed to deserialize task");
        assert_eq!(task.id, "AuveBWEBx14WC5Xuurb1yf");
        assert_eq!(task.name, "continous batch");
        assert_eq!(task.status, "open");
        assert_eq!(task.project_name.as_deref(), Some("ML"));
        assert_eq!(task.tags, vec!["重要"]);
        assert_eq!(task.activation_date.as_deref(), Some("2026-09-10"));
        assert!(task.due_date.is_none());
    }

    #[test]
    fn maps_list_info_json() {
        let sample_json = r#"[
            {"id": "TMInboxListSource", "name": "收件箱", "kind": "builtin"},
            {"id": "33qqsaBfTJHDoUYno5uMNb", "name": "工作", "kind": "area"}
        ]"#;

        let lists: Vec<ListInfo> =
            serde_json::from_str(sample_json).expect("Failed to deserialize lists");
        assert_eq!(lists.len(), 2);
        assert_eq!(lists[0].kind, "builtin");
        assert_eq!(lists[1].kind, "area");
        assert!(lists[0].area_id.is_none());
    }

    #[test]
    fn maps_project_list_info_json() {
        let sample_json = r#"[
            {"id": "6LZSFCcw7zge5p6mjmuZjM", "name": "ML", "kind": "project", "areaId": "CzRbp1Dfvs96s9KYCVuWSU", "areaName": "学习"}
        ]"#;

        let lists: Vec<ListInfo> =
            serde_json::from_str(sample_json).expect("Failed to deserialize project list");
        assert_eq!(lists.len(), 1);
        assert_eq!(lists[0].kind, "project");
        assert_eq!(lists[0].name, "ML");
        assert_eq!(lists[0].area_name.as_deref(), Some("学习"));
    }
}
