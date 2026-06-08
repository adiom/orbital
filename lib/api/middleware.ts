import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Error response format for validation failures
 * Requirements: 2.2
 */
export type ValidationErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
};

/**
 * Configuration for validation middleware
 */
export type ValidationConfig = {
  strict?: boolean; // If true, reject unknown fields
};

/**
 * Validation middleware that uses Zod schemas
 * Requirements: 2.2, 2.3
 *
 * @param schema - Zod schema to validate against
 * @param source - Where to get data from ('body' | 'query' | 'params')
 * @param config - Validation configuration
 * @returns Validated data or error response
 */
export async function validateRequest<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
  source: "body" | "query" | "params" = "body",
  _config: ValidationConfig = {}
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ValidationErrorResponse> }
> {
  try {
    let data: any;

    // Extract data based on source
    switch (source) {
      case "body":
        try {
          data = await request.json();
        } catch {
          return {
            success: false,
            response: NextResponse.json(
              {
                error: {
                  code: "INVALID_JSON",
                  message: "Request body must be valid JSON",
                },
              },
              { status: 400 }
            ),
          };
        }
        break;

      case "query":
        data = Object.fromEntries(request.nextUrl.searchParams.entries());
        break;

      case "params":
        // Params should be passed separately as they come from route context
        throw new Error("Use validateParams for route params validation");

      default:
        throw new Error(`Unknown source: ${source}`);
    }

    // Validate data against schema
    // Note: Zod strict mode would be applied at schema definition level
    const result = schema.safeParse(data);

    if (!result.success) {
      // Format Zod errors into a readable structure
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }

      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
              details,
            },
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Validation middleware error:", error);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An error occurred during validation",
          },
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validate route parameters
 * Requirements: 2.2, 2.3
 *
 * @param params - Route parameters object
 * @param schema - Zod schema to validate against
 * @returns Validated data or error response
 */
export function validateParams<T extends z.ZodType>(
  params: Record<string, any>,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ValidationErrorResponse> } {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }

      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Route parameter validation failed",
              details,
            },
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Parameter validation error:", error);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An error occurred during parameter validation",
          },
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Helper to create a validation error response
 * Requirements: 2.2
 */
export function createValidationError(
  message: string,
  details?: Record<string, string[]>
): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message,
        details,
      },
    },
    { status: 400 }
  );
}

/**
 * Helper to create a generic error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status = 500,
  details?: Record<string, any>
): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}
