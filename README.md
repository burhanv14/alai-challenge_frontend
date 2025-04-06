# Alai Coding Challenge - Hub and Spoke Diagram

## Project Overview

The goal of this project is to create a **hub and spoke diagram** using **TlDraw**, allowing users to interact with the diagram by adding and removing spokes. This is achieved through a simple and intuitive interface with buttons to manage the spokes. The challenge also incorporates functionality to move the hub and spoke lines dynamically, ensuring smooth interactions.

### Key Features:
- **Basic functionality**: Create and manage a hub and spoke diagram with the ability to add and remove spokes.
- **Customizable spokes**: Allow users to add or remove spokes with the ability to adjust the number of spokes (between 2-6).
- **Extra functionality**:
  - Move the text on the spokes, and the corresponding line should move with it.
  - Prevent collisions between the spoke textboxes.
  - Move the entire diagram when the hub is moved.

### Technologies Used:
- **React.js** with **TypeScript** for a modern, component-based UI.
- **TlDraw** library for creating the interactive diagram.
- **CSS** for styling the app.
- **Bun.js** for fast and efficient bundling.
- **npm** for dependency management.

---

## Installation

To get started with this project on your local machine, follow the steps below:

### Prerequisites
Ensure you have the following installed:
- **Node.js** (version 16.x or higher)
- **npm** (Node Package Manager)

### Steps to Set Up Locally

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/alai-coding-challenge.git
   cd alai-coding-challenge/frontend/
   ```

2. **Install Dependencies**
   This project uses **npm** for dependency management. Run the following command to install all required packages:
   ```bash
   npm install
   ```

3. **Run the Development Server**
   Start the development server using **Bun.js**:
   ```bash
   bun run dev
   ```

4. **Open the Project**
   After the server starts, you should be able to open the project in your browser at:
   ```plaintext
   http://localhost:3000
   ```

---

## Usage

### Features:

- **Add/Remove Spokes**: You can add and remove spokes via simple buttons outside the diagram canvas. The diagram supports between 2 and 6 spokes.
  
- **Move Spokes and Hub**:
   - Drag and move the spoke text to automatically adjust the corresponding line.
   - The entire diagram can be moved by dragging the hub.

- **Prevent Collisions**: The diagram includes logic to prevent collisions between spoke textboxes, ensuring a clean layout.

---

## Folder Structure

Here is an overview of the project's folder structure:

```
/src
  /components
    TldrawComponent.tsx       # Main component for rendering the TlDraw canvas
  App.tsx                     # Main app component
  index.tsx                   # Entry point of the React app
  index.css                   # Styles for the app
/public
  index.html                  # Basic HTML template for the app
```

---

## Extra Features (Bonus)

1. **Move Spoke Text with Corresponding Line**: 
   - When you move the text on a spoke, the associated spoke line automatically moves with it. 
   - This is achieved using bindings in TlDraw, inspired by the [TlDraw Layout Bindings Example](https://examples.tldraw.com/layout-bindings).

2. **Prevent Text Collisions**:
   - The application includes functionality to prevent textboxes from overlapping with one another when moving spokes around.

3. **Move Entire Diagram with Hub**:
   - When you move the hub around, the entire diagram (including spokes) will move accordingly, maintaining its structure.



---

## Acknowledgments

- **TlDraw**: The diagramming library used in this project.
- **React.js** and **TypeScript**: For building the modern web application.
- **Bun.js**: The bundler used for fast development.
