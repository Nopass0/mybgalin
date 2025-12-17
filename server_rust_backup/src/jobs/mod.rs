pub mod models;
pub mod hh_api;
pub mod ai;
pub mod scheduler;

pub use models::*;
pub use hh_api::*;
pub use ai::*;
pub use scheduler::*;

/// Wrapper for optional JobScheduler (SQLite-only feature)
pub struct MaybeJobScheduler(pub Option<JobScheduler>);

impl MaybeJobScheduler {
    pub fn new(scheduler: Option<JobScheduler>) -> Self {
        Self(scheduler)
    }

    pub fn is_available(&self) -> bool {
        self.0.is_some()
    }

    pub fn get(&self) -> Option<&JobScheduler> {
        self.0.as_ref()
    }
}
