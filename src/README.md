# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Sign up for activities

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Sign up for an activity                                             |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

## Activity Configuration

Activities are defined in `activities.json` in this folder. Teachers can update that file directly to add, remove, or edit available activities without changing Python code.

Each activity supports these optional fields for the activity toolbar:
- `category` (for filtering, e.g. `Academic`, `Sports`, `Arts`)
- `start_time` in 24-hour format `HH:MM` (for sorting by earliest start time)

## Admin Mode

Teacher credentials are stored in `teachers.json` as username/password pairs.

- Teachers can log in from the user icon in the top-right corner.
- Only logged-in teachers can register or unregister students.
- Students can still view activities and participant lists without logging in.

All data is stored in memory at runtime, which means participant changes reset when the server restarts.
