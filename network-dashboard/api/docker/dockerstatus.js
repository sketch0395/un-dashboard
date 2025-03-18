

export default async function handler(req, res) {
    const { containerId } = req.query;

    try {
        const response = await fetch(`http://localhost:4000/status/${containerId}`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ status: "error" });
    }
}
