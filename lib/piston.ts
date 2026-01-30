export type PistonResponse = {
    language: string;
    version: string;
    run: {
        stdout: string;
        stderr: string;
        output: string;
        code: number;
        signal: string | null;
    };
    compile?: {
        stdout: string;
        stderr: string;
        output: string;
        code: number;
        signal: string | null;
    };
};

// Map our internal language keys to Piston's runtime requirements
const RUNTIME_MAP: Record<string, { language: string; version: string }> = {
    'python': { language: 'python', version: '3.10.0' },
    'javascript': { language: 'javascript', version: '18.15.0' },
    'typescript': { language: 'typescript', version: '5.0.3' },
    'java': { language: 'java', version: '15.0.2' },
    'cpp': { language: 'c++', version: '10.2.0' },
    'go': { language: 'go', version: '1.16.2' },
};

export async function executeCode(
    language: string,
    code: string,
    stdin: string = ""
): Promise<PistonResponse> {
    const runtime = RUNTIME_MAP[language.toLowerCase()];

    if (!runtime) {
        throw new Error(`Unsupported language: ${language}`);
    }

    // Prepare payload for Piston API
    // We use the public Piston instance: https://emkc.org/api/v2/piston
    const payload = {
        language: runtime.language,
        version: runtime.version,
        files: [
            {
                name: getFileName(runtime.language),
                content: code
            }
        ],
        stdin: stdin,
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
    };

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Execution API Error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        return data as PistonResponse;

    } catch (error: any) {
        console.error("[Piston Execution Error]", error);
        // Return a mock failure response structure so the UI can show the error
        return {
            language: runtime.language,
            version: runtime.version,
            run: {
                stdout: "",
                stderr: `Execution System Error: ${error.message}`,
                output: `Execution System Error: ${error.message}`,
                code: 1,
                signal: null
            }
        };
    }
}

function getFileName(language: string): string {
    switch (language) {
        case 'java': return 'Main.java';
        case 'python': return 'main.py';
        case 'javascript': return 'main.js';
        case 'typescript': return 'main.ts';
        case 'c++': return 'main.cpp';
        case 'go': return 'main.go';
        default: return 'source';
    }
}
