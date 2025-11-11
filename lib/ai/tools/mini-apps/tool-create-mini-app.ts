import { tool } from "ai";
import { z } from "zod";
import { generateUUID } from "@/lib/utils";

// Enhanced schema for React app generation
const miniAppInput = z.object({
  title: z.string().min(2).describe("Human readable title for the mini app"),
  purpose: z
    .string()
    .min(4)
    .describe(
      "Short description of what the app should help with (e.g. calorie tracking, todo list, calculator)"
    ),
  features: z
    .array(z.string().min(2))
    .min(1)
    .max(10)
    .default(["input", "result"])
    .describe(
      "List of core features / modules (e.g. 'search bar', 'results list', 'filter options')"
    ),
  theme: z
    .enum(["light", "dark", "auto"])
    .default("auto")
    .describe("Color theme for the app"),
  complexity: z
    .enum(["simple", "medium", "complex"])
    .default("medium")
    .describe("Complexity level of the generated app"),
});

// Helper to generate component based on feature type
function generateFeatureComponent(feature: string, index: number): any {
  const featureLower = feature.toLowerCase();

  // Common patterns for different feature types
  if (
    featureLower.includes("input") ||
    featureLower.includes("search") ||
    featureLower.includes("text")
  ) {
    return {
      type: "input",
      props: {
        placeholder: `Enter ${feature}...`,
        onChange: `handleInput${index}`,
        value: `inputValue${index}`,
      },
      state: [
        `const [inputValue${index}, setInputValue${index}] = useState('');`,
      ],
      handlers: [
        `const handleInput${index} = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue${index}(e.target.value);`,
      ],
    };
  }

  if (
    featureLower.includes("button") ||
    featureLower.includes("submit") ||
    featureLower.includes("action")
  ) {
    return {
      type: "button",
      props: {
        onClick: `handleClick${index}`,
        children: feature,
      },
      handlers: [
        `const handleClick${index} = () => {\n    console.log('${feature} clicked');\n    // Add your action logic here\n  };`,
      ],
    };
  }

  if (
    featureLower.includes("list") ||
    featureLower.includes("results") ||
    featureLower.includes("items")
  ) {
    return {
      type: "list",
      props: {
        items: `items${index}`,
      },
      state: [
        `const [items${index}, setItems${index}] = useState<string[]>(['Item 1', 'Item 2', 'Item 3']);`,
      ],
    };
  }

  if (featureLower.includes("counter") || featureLower.includes("number")) {
    return {
      type: "counter",
      props: {
        value: `count${index}`,
        onIncrement: `increment${index}`,
        onDecrement: `decrement${index}`,
      },
      state: [`const [count${index}, setCount${index}] = useState(0);`],
      handlers: [
        `const increment${index} = () => setCount${index}(prev => prev + 1);`,
        `const decrement${index} = () => setCount${index}(prev => prev - 1);`,
      ],
    };
  }

  if (featureLower.includes("toggle") || featureLower.includes("switch")) {
    return {
      type: "toggle",
      props: {
        checked: `isToggled${index}`,
        onChange: `handleToggle${index}`,
        label: feature,
      },
      state: [
        `const [isToggled${index}, setIsToggled${index}] = useState(false);`,
      ],
      handlers: [
        `const handleToggle${index} = () => setIsToggled${index}(prev => !prev);`,
      ],
    };
  }

  if (featureLower.includes("select") || featureLower.includes("dropdown")) {
    return {
      type: "select",
      props: {
        value: `selectedValue${index}`,
        onChange: `handleSelect${index}`,
        options: `options${index}`,
      },
      state: [
        `const [selectedValue${index}, setSelectedValue${index}] = useState('');`,
        `const options${index} = ['Option 1', 'Option 2', 'Option 3'];`,
      ],
      handlers: [
        `const handleSelect${index} = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedValue${index}(e.target.value);`,
      ],
    };
  }

  if (featureLower.includes("form")) {
    return {
      type: "form",
      props: {
        onSubmit: `handleSubmit${index}`,
      },
      state: [`const [formData${index}, setFormData${index}] = useState({});`],
      handlers: [
        `const handleSubmit${index} = (e: React.FormEvent) => {\n    e.preventDefault();\n    console.log('Form submitted:', formData${index});\n  };`,
      ],
    };
  }

  if (featureLower.includes("card") || featureLower.includes("panel")) {
    return {
      type: "card",
      props: {
        title: feature,
        content: `content${index}`,
      },
      state: [`const content${index} = 'Card content goes here';`],
    };
  }

  return {
    type: "container",
    props: {
      children: feature,
    },
  };
}

// Generate the React component code
function generateReactCode(
  title: string,
  purpose: string,
  features: string[]
): string {
  const componentName = title
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^./, (str) => str.toUpperCase());
  const featureComponents = features.map((f, i) =>
    generateFeatureComponent(f, i)
  );

  // Collect all state declarations and handlers
  const stateDeclarations = featureComponents
    .flatMap((fc) => fc.state || [])
    .join("\n  ");

  const handlers = featureComponents
    .flatMap((fc) => fc.handlers || [])
    .join("\n  ");

  // Generate JSX for each feature
  const featureJSX = featureComponents
    .map((fc) => {
      switch (fc.type) {
        case "input":
          return `        <div className="mb-4">
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
            placeholder="${fc.props.placeholder}"
            value={${fc.props.value}}
            onChange={${fc.props.onChange}}
          />
        </div>`;
        case "button":
          return `        <button
          onClick={${fc.props.onClick}}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          ${fc.props.children}
        </button>`;
        case "list":
          return `        <div className="space-y-2">
          {${fc.props.items}.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {item}
            </div>
          ))}
        </div>`;
        case "counter":
          return `        <div className="flex items-center gap-4">
          <button
            onClick={${fc.props.onDecrement}}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            -
          </button>
          <span className="text-2xl font-bold">{${fc.props.value}}</span>
          <button
            onClick={${fc.props.onIncrement}}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            +
          </button>
        </div>`;
        case "toggle":
          return `        <div className="flex items-center gap-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={${fc.props.checked}}
              onChange={${fc.props.onChange}}
              className="mr-2 w-4 h-4"
            />
            <span>{${fc.props.label}}</span>
          </label>
        </div>`;
        case "select":
          return `        <div className="mb-4">
          <select
            value={${fc.props.value}}
            onChange={${fc.props.onChange}}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="">Select an option</option>
            {${fc.props.options}.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        </div>`;
        case "form":
          return `        <form onSubmit={${fc.props.onSubmit}} className="space-y-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Submit
          </button>
        </form>`;
        case "card":
          return `        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-2">${fc.props.title}</h3>
          <p className="text-gray-600 dark:text-gray-300">{${fc.props.content}}</p>
        </div>`;
        default:
          return `        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold">${fc.props.children}</h3>
        </div>`;
      }
    })
    .join("\n");

  return `function ${componentName}() {
  ${stateDeclarations}
  ${handlers}

  useEffect(() => {
    console.log('${componentName} mounted');
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
        ${title}
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        ${purpose}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
${featureJSX}
      </div>
    </div>
  );
}

render(<${componentName} />);`;
}

export const createMiniApp = tool({
  description:
    "Create a fully functional React mini-app with interactive components. " +
    "Generates complete React code with state management, event handlers, and Tailwind CSS styling.",
  inputSchema: miniAppInput,
  execute: ({ title, purpose, features, theme, complexity }) => {
    const id = generateUUID();

    // Generate the React component code
    const reactCode = generateReactCode(title, purpose, features);

    // Create component metadata
    const componentInfo = {
      name: title.replace(/[^a-zA-Z0-9]/g, ""),
      imports: ["import React, { useState, useEffect } from 'react';"],
      dependencies: {
        react: "^18.0.0",
        tailwindcss: "^3.0.0",
      },
      hasState: true,
      hasEffects: true,
    };

    return {
      toolName: "create-mini-app",
      id,
      title,
      purpose,
      features,
      theme,
      complexity,
      componentInfo,
      reactCode,
      instructions: {
        setup: [
          "1. Create a new React component file",
          "2. Copy the generated code",
          "3. Import and use the component in your app",
          "4. Ensure Tailwind CSS is configured",
        ],
        customization: [
          "- Modify state logic as needed",
          "- Adjust styling with Tailwind classes",
          "- Add API calls or database connections",
          "- Extend with additional features",
        ],
      },
      specVersion: 2,
      message: `React mini-app "${title}" generated successfully with ${features.length} interactive features`,
    };
  },
});
