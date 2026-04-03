# Frontend Architecture Blueprint (React + Tailwind)

## 1. Complete Frontend Folder Architecture

This structure guarantees that your React code remains clean, component-isolated, and ready to scale well past a hackathon.

```text
/frontend
│── /public                 # Uncompiled static assets (favicon, raw PDFs)
│── /src
│   │── /assets             # SVGs, Logos, Illustrations
│   │── /components         # Pure presentational & smart components
│   │   │── /common         # UI Primitives (Button, Input, Modal, Spinner, Badge)
│   │   │── /layout         # Structural (Sidebar, Navbar, PageHeader)
│   │   │── /grading        # Domain-specific (ClusterViewer, RubricMatcher, ScoreBadge)
│   │   └── /forms          # Form modules (RubricBuilderForm, UploadDropzone)
│   │── /context            # React Context providers
│   │   └── AuthContext.jsx # For wrapping the app to protect routes
│   │── /hooks              # Custom reusable logic
│   │   │── useAuth.js      # Auth state hooks
│   │   └── usePipeline.js  # Polling hook for ML orchestration status
│   │── /pages              # Route-level Views (The Screens)
│   │   │── /auth           # Login.jsx
│   │   │── /dashboard      # Home.jsx (Overview)
│   │   │── /setup          # ExamList.jsx, CreateExam.jsx
│   │   │── /rubric         # RubricManager.jsx
│   │   │── /evaluation     # EvaluationCenter.jsx (Uploads & Progress)
│   │   └── /review         # FacultyReviewInterface.jsx (The core grading UI)
│   │── /services           # API integration / Axios wrappers
│   │   │── api.js          # Axios singleton with interceptors (JWT injection)
│   │   │── authService.js  # login(), logout()
│   │   └── examService.js  # fetchExams(), submitRubric(), approveScore()
│   │── /store              # State Management (Zustand recommended)
│   │   └── useGradingStore.js # Stores the active `examId` and `currentCluster`
│   │── /utils              # Helpers
│   │   │── cn.js           # Tailwind class merger (`clsx` + `tailwind-merge`)
│   │   └── formatters.js   # Date and score formatting
│   │── App.jsx             # React-Router-DOM definitions
│   └── index.css           # Tailwind base directives
```

---

## 2. Explanation of Layers & Module Mapping

*   **`/components/common`**: These are "dumb" components. They only take props and emit events. They know nothing about your business logic. 
*   **`/components/grading`**: These are "smart" components. A `ClusterViewer.jsx` might read directly from your Zustand store.
*   **`/pages`**: These map directly to the URIs in your browser (e.g. `localhost:5173/review/exam_123`). They fetch data on mount and pass it down to components.
*   **`/services`**: Centralized API points. Never put `axios.get()` or `fetch()` inside a component or page. Always call `examService.fetchReviewData()`. This makes testing and debugging 10x easier.

---

## 3. UI Layout Hierarchy & Theme

We want the UI to feel like a **Professional Academic Workflow Tool**, not a student interface.

*   **Layout Style**: A persistent Left-nav (Sidebar) standard dashboard layout.
*   **Sidebar Links**: 
    1. Overview (Dashboard)
    2. Subjects & Exams (Setup)
    3. Evaluations (Upload & Status)
    4. Review Hub (Grading)
    5. Analytics

*   **Theme / Aesthetics**: 
     - **Colors**: Deep Slate backgrounds (`bg-slate-900`) combined with Crisp White (`bg-white`) cards and Academic Blue accents (`bg-blue-600`) for primary actions.
     - **Typography**: `Inter` or `Geist` for high legibility on text-heavy grading screens.

---

## 4. Auth Flow Architecture

1. **User Submits Form** -> `Login.jsx` calls `authService.login()`.
2. **Backend Responds** -> Returns a JWT string.
3. **Storage** -> `authService` stores JWT in `localStorage`.
4. **Context Update** -> `AuthContext` reads the token, sets `isAuthenticated = true`, and re-renders the app.
5. **Interceptor setup** -> `services/api.js` automatically attaches `Authorization: Bearer <token>` to all future outgoing API requests.
6. **Protected Routing** -> React Router checks `isAuthenticated` inside a `<ProtectedRoute>` wrapper. If false, redirects to `/login`.

---

## 5. Reusable Component Mapping for the Core Module: "Faculty Review Dashboard"

This is the most complex screen. It needs strict modularity. This single `/review/FacultyReview.jsx` page should be composed of:

*   `<SidebarLayout />`: The main wrapper.
*   **Split Pane Left (The AI Summary)**:
    *   `<ClusterList />`: Shows a scrollable list of grouped answers. (e.g. "Cluster 1: 4 Answers").
    *   `<RubricMatcherCard />`: Highlights which keywords the AI found for this active cluster.
    *   `<ScoreSuggestBadge />`: High-contrast UI showing the AI's numerical suggestion and confidence score.
*   **Split Pane Right (The Evidence)**:
    *   `<AnswerCarousel />`: A swipable view or paginated view showing the literal segmented answers in this cluster.
    *   `<MarkupViewer />`: Renders the text with highlighted phrases (e.g., green for correct concepts, red for missing formulas).
*   **Action Footer**:
    *   `<GradingToolbar />`: Contains an input to manually override the score, and a giant "Approve & Apply to All" button.

---

## 6. State Management Recommendations

Use **Zustand** over Redux. It is infinitely lighter and perfect for hackathons.

**Store Schema (`useGradingStore.js`)**:
```javascript
import { create } from 'zustand';

export const useGradingStore = create((set) => ({
  activeExamId: null,
  clusters: [],               // Array of fetched clusters
  activeClusterIndex: 0,      // Which cluster we are currently looking at in the UI
  rubric: null,

  setActiveExam: (id) => set({ activeExamId: id }),
  setClusters: (data) => set({ clusters: data }),
  nextCluster: () => set((state) => ({ activeClusterIndex: state.activeClusterIndex + 1 })),
  // Update a single cluster's score after faculty approves
  updateClusterScore: (id, score) => set((state) => ({
    clusters: state.clusters.map(c => c.id === id ? { ...c, approvedScore: score, status: 'GRADED' } : c)
  }))
}));
```

---

## 7. MVP-First Screen Priority

If you only have 24-48 hours, build the screens in this order to guarantee a killer demo:

1. **`FacultyReviewInterface.jsx` (Priority 1 - The "Wow" Factor)**: Build the dashboard where faculty see the AI group the answers and suggest scores. Do this *before* you even build the upload or login screens. Hardcode JSON data from the AI into `useState` initially if you have to.
2. **`EvaluationCenter.jsx` (Priority 2)**: The Dropzone where users throw their PDFs/Images, with a fake loading bar until the backend actually connects.
3. **`RubricManager.jsx` (Priority 3)**: A simple dynamic form (Add Row, Remove Row) to define keywords.
4. **`Login.jsx` & Dashboard (Priority 4)**: Building login is standard boilerplate. Save it for the end. The judges want to see the AI Review interface, not a standard login screen.

---

## 8. Best Practices for This Repository

1. **Never mutate state directly**: Always use the Zustand setter functions or React's `setState`.
2. **Treat API calls as dirty**: Always try/catch in your components or `useHooks`. Provide a fallback UI error state (using `react-hot-toast` for friendly error popups).
3. **Tailwind Class Merging**: Your `utils/cn.js` file is critical. It allows you to create reusable components that can accept overriding classes safely: 
    ```javascript
    // cn.js helper example
    import { clsx } from "clsx";
    import { twMerge } from "tailwind-merge";
    export function cn(...inputs) { return twMerge(clsx(inputs)); }
    ```
