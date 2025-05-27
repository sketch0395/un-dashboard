# Nexus Control

A comprehensive network monitoring and Docker management system built with [Next.js](https://nextjs.org).

## Project Overview

Nexus Control offers advanced network topology visualization and management features:

- Interactive network maps with circular, hierarchical, and geographic views
- Device categorization and custom naming
- Gateway and switch role designation with visual relationships
- Main gateway designation with visual indicators
- Real-time SSH connectivity from the browser
- Robust Socket.IO connection handling for reliable real-time updates

## Getting Started

### Dependencies

Make sure you have Node.js (v14 or higher) and npm installed.

```bash
# Install dependencies
npm install
```

### Running the Application

1. **Start the Next.js development server:**

```bash
npm run dev
```

2. **Start the network scanning server (in a separate terminal):**

```bash
node server-network.js
```

3. **For Docker management features, start the Docker server (in a separate terminal):**

```bash
node server-docker.js
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

> **Important**: Both the Next.js server and the network scanning server must be running for the application to function correctly. If you encounter "xhr poll error" messages, ensure the network scanning server is running.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a custom font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Recent Improvements

### Socket.IO Connection Enhancements (July 2023)

- **Client-Side Improvements**:
  - Enhanced reconnection logic with configurable retry attempts
  - Implemented proper event listener cleanup to prevent memory leaks
  - Added comprehensive error handling with specific error messages
  - Optimized transport selection with websocket prioritization

- **Server-Side Improvements**:
  - Configured CORS to allow connections from multiple origins
  - Optimized ping timeouts and intervals for better connection stability
  - Enhanced transport support with both websocket and polling options
  - Added request logging for better debugging capabilities

### Bug Fixes

- Fixed "nodeMap is not defined" error in HierarchicalNetworkView by correcting variable scope
- Resolved device connection initialization issues in UnifiedDeviceModal
- Eliminated duplicate imports in component files
- Fixed Socket.IO "xhr poll error" connection failures

## Deployment Options

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Local Production Deployment

For local production deployment:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

Make sure both the Next.js server and the network scanning server are running for full functionality.

## Contributing

Contributions to Nexus Control are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Socket.IO Connection Issues

If you encounter Socket.IO connection problems:

1. **"xhr poll error" messages**:
   - Ensure the network scanning server (`server-network.js`) is running
   - Check that the server URL in your client configuration matches the actual server address
   - Verify there are no firewall rules blocking the connection

2. **Connection timeouts**:
   - The application is configured to retry connections automatically
   - Check network connectivity between client and server
   - Ensure the server is not overloaded

3. **CORS errors**:
   - If accessing from a different origin than configured, add the origin to the CORS settings in `server-network.js`

### Other Common Issues

- **Network scans not working**: Ensure you have proper permissions to perform network scans (may require admin/root privileges)
- **Docker commands failing**: Verify Docker daemon is running and current user has permissions to access it
- **Visualization not showing**: Check browser console for JavaScript errors and ensure data is being properly received from the server
