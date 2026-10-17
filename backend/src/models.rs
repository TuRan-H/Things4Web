use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub name: String,
    pub status: String,
    pub notes: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub area_id: Option<String>,
    pub area_name: Option<String>,
    pub tags: Vec<String>,
    pub due_date: Option<String>,
    pub activation_date: Option<String>,
    pub completion_date: Option<String>,
    pub cancellation_date: Option<String>,
    pub creation_date: Option<String>,
    pub modification_date: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListInfo {
    pub id: String,
    pub name: String,
    pub kind: String, // "builtin" | "area" | "project"
    #[serde(default)]
    pub area_id: Option<String>,
    #[serde(default)]
    pub area_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JxaError {
    pub code: String,
    pub message: String,
    #[allow(dead_code)]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JxaResponse<T> {
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<JxaError>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskQueryParams {
    pub list_name: Option<String>,
    pub list_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RefreshParams {
    pub relaunch: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskPayload {
    pub name: String,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub target_list: Option<String>,
    #[serde(default)]
    pub due_date: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskStatusPayload {
    #[serde(default)]
    pub status: Option<String>,
}
