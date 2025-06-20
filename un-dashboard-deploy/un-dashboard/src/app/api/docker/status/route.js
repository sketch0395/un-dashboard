import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" }); // Update socketPath if necessary

export async function GET() {
  console.log("API /api/docker/status called"); // Debugging log

  try {
    const containers = await docker.listContainers({ all: true });
    console.log("Containers found:", containers); // Debugging log
    return new Response(JSON.stringify(containers), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🚨 Docker API Error:", error.message); // Log error
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
