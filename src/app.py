"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import json
import secrets
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

def load_activities() -> dict:
    activities_file = current_dir / "activities.json"
    try:
        with open(activities_file, "r", encoding="utf-8") as file:
            activities_data = json.load(file)
    except FileNotFoundError as error:
        raise RuntimeError(f"Missing activities file: {activities_file}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Invalid JSON in {activities_file}: {error}") from error

    if not isinstance(activities_data, dict):
        raise RuntimeError("activities.json must contain an object mapping activity names to details")

    return activities_data


def load_teachers() -> dict:
    teachers_file = current_dir / "teachers.json"
    try:
        with open(teachers_file, "r", encoding="utf-8") as file:
            teachers_data = json.load(file)
    except FileNotFoundError as error:
        raise RuntimeError(f"Missing teachers file: {teachers_file}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Invalid JSON in {teachers_file}: {error}") from error

    if not isinstance(teachers_data, dict):
        raise RuntimeError("teachers.json must contain an object mapping usernames to passwords")

    return teachers_data


class LoginRequest(BaseModel):
    username: str
    password: str


def require_teacher(teacher_token: str | None):
    if not teacher_token or teacher_token not in teacher_sessions:
        raise HTTPException(status_code=403, detail="Teacher login required")


# In-memory activity database loaded from JSON
activities = load_activities()
teachers = load_teachers()
teacher_sessions = {}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/auth/login")
def login(login_request: LoginRequest):
    expected_password = teachers.get(login_request.username)
    if expected_password is None or expected_password != login_request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_urlsafe(24)
    teacher_sessions[token] = login_request.username
    return {"token": token, "username": login_request.username}


@app.get("/auth/session")
def get_session(teacher_token: str | None = Header(default=None, alias="X-Teacher-Token")):
    if teacher_token and teacher_token in teacher_sessions:
        return {"authenticated": True, "username": teacher_sessions[teacher_token]}
    return {"authenticated": False}


@app.post("/auth/logout")
def logout(teacher_token: str | None = Header(default=None, alias="X-Teacher-Token")):
    if teacher_token and teacher_token in teacher_sessions:
        del teacher_sessions[teacher_token]
    return {"message": "Logged out"}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(
    activity_name: str,
    email: str,
    teacher_token: str | None = Header(default=None, alias="X-Teacher-Token"),
):
    """Sign up a student for an activity"""
    require_teacher(teacher_token)

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(
    activity_name: str,
    email: str,
    teacher_token: str | None = Header(default=None, alias="X-Teacher-Token"),
):
    """Unregister a student from an activity"""
    require_teacher(teacher_token)

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
