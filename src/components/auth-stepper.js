import "./auth-stepper.css"

export function AuthStepper({ currentStep }) {
  return (
    <div className="auth-stepper">
      <div className={`auth-step ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
        <div className="step-circle">
          {currentStep > 1 ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : "1"}
        </div>
        <span className="step-label">Create Account</span>
      </div>
      <div className="step-connector">
        <div className={`step-connector-fill ${currentStep > 1 ? "active" : ""}`} />
      </div>
      <div className={`auth-step ${currentStep >= 2 ? "active" : ""}`}>
        <div className="step-circle">2</div>
        <span className="step-label">Register as Player</span>
      </div>
    </div>
  )
}
