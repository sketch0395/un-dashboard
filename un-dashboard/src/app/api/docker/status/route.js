import Docker from "dockerode";

const docker = new Docker({ socketPath: "10.5.1.130:4000/var/run/docker.sock" });

export async function GET() {
  console.log("API /api/docker/status called"); // ✅ Debugging log

  try {
    const containers = await docker.listContainers({ all: true });
    console.log("Containers found:", containers); // ✅ Debugging log
    return Response.json(containers);
  } catch (error) {
    console.error("🚨 Docker API Error:", error.message); // ✅ Log error
    return Response.json({ error: error.message }, { status: 500 });
  }
}
