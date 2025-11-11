"use client";

import { MiniAppArtifact } from "@/components/orbit/mini-app-artifact";

export default function TestArtifactPage() {
  // Example 1: Simple counter component
  const counterCode = `function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2 style={{ color: '#7c3aed', marginBottom: '20px' }}>Counter App</h2>
      <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '20px' }}>
        {count}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => setCount(count - 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <button
          onClick={() => setCount(0)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}`;

  // Example 2: Todo list
  const todoCode = `function TodoList() {
  const [todos, setTodos] = React.useState([
    { id: 1, text: 'Learn React', done: true },
    { id: 2, text: 'Build awesome apps', done: false }
  ]);
  const [input, setInput] = React.useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, done: false }]);
      setInput('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#7c3aed', marginBottom: '20px' }}>My Todo List</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new task..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={addTodo}
          style={{
            padding: '8px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Add
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {todos.map(todo => (
          <div
            key={todo.id}
            onClick={() => toggleTodo(todo.id)}
            style={{
              padding: '12px',
              backgroundColor: todo.done ? '#f3f4f6' : 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: '2px solid #7c3aed',
              backgroundColor: todo.done ? '#7c3aed' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px'
            }}>
              {todo.done && '✓'}
            </div>
            <span style={{
              textDecoration: todo.done ? 'line-through' : 'none',
              color: todo.done ? '#9ca3af' : '#1f2937'
            }}>
              {todo.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}`;

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="mb-2 font-bold text-3xl">Live React Preview Test</h1>
        <p className="text-muted-foreground">
          Testing the MiniAppArtifact component with live React code execution
        </p>
      </div>

      <MiniAppArtifact
        componentInfo={{
          name: "Counter",
          imports: ["React"],
          dependencies: { react: "^19.0.0" },
          hasState: true,
          hasEffects: false,
        }}
        features={["State Management", "Button Actions", "Real-time Updates"]}
        id="counter-app-001"
        purpose="Interactive counter with increment and decrement"
        reactCode={counterCode}
        specVersion={2}
        title="Counter Application"
      />

      <MiniAppArtifact
        componentInfo={{
          name: "TodoList",
          imports: ["React"],
          dependencies: { react: "^19.0.0" },
          hasState: true,
          hasEffects: false,
        }}
        features={[
          "Add Tasks",
          "Toggle Completion",
          "Persistent State",
          "Keyboard Support",
        ]}
        id="todo-app-002"
        purpose="Manage your daily tasks with a simple todo list"
        reactCode={todoCode}
        specVersion={2}
        title="Todo List Application"
      />
    </div>
  );
}
