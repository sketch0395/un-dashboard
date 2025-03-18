import { exec } from 'child_process';

export default function handler(req, res) {
    const { containerId, action } = req.body;

    if (!containerId || !["start", "stop"].includes(action)) {
        return res.status(400).json({ error: "Invalid container ID or action" });
    }

    const command = `docker ${action} ${containerId}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: stderr || "Failed to execute command" });
        }
        return res.status(200).json({ message: `Container ${action}ed successfully` });
    });
}
