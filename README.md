# AI Blog Generator Frontend

A modern, responsive React chat interface for the AI Blog Generator. This frontend provides a sleek chat experience where users can request blog posts on any topic and receive AI-generated content.

## Features

✨ **Modern Chat Interface** - Clean, responsive design with smooth animations
🎨 **Beautiful UI** - Gradient backgrounds, glassmorphism effects, and modern styling
📱 **Mobile Responsive** - Works perfectly on desktop, tablet, and mobile devices
🚀 **Real-time Communication** - Instant messaging with loading states
📝 **Blog Formatting** - Automatic formatting for generated blog content
🔄 **Auto-scroll** - Messages automatically scroll to the latest content

## Tech Stack

- **React 18** - Modern React with hooks
- **CSS3** - Custom styling with gradients and animations
- **Nginx** - Production web server
- **Docker** - Containerized deployment

## Quick Start

### Development Mode

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

### Docker Deployment

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:4002`

## Configuration

The frontend is configured to connect to the FastAPI backend at `127.0.0.1:4002`. If you need to change this:

1. Edit the API endpoint in `src/App.js`:
   ```javascript
   const response = await fetch('http://YOUR_BACKEND_URL/blog', {
   ```

## Usage

1. **Start a conversation** - The AI will greet you when you open the app
2. **Enter a topic** - Type any blog topic in the input field (e.g., "AI trends 2024", "healthy cooking tips")
3. **Send your request** - Click the rocket button or press Enter
4. **Wait for generation** - The AI will process your request (this may take 30-60 seconds)
5. **Read your blog** - The generated blog post will appear with proper formatting

## Example Topics

- "Artificial Intelligence trends in 2024"
- "Benefits of meditation for mental health"
- "Sustainable living tips for beginners"
- "The future of renewable energy"
- "Best practices for remote work"

## Project Structure

```
blog-frontend/
├── public/
│   ├── index.html
│   └── ...
├── src/
│   ├── App.js          # Main chat component
│   ├── App.css         # Styling and animations
│   └── index.js        # React entry point
├── Dockerfile          # Container configuration
├── nginx.conf          # Nginx configuration
├── docker-compose.yml  # Multi-service setup
└── README.md
```

## Styling Features

- **Gradient Backgrounds** - Beautiful purple-blue gradients
- **Glassmorphism** - Frosted glass effects with backdrop blur
- **Smooth Animations** - Slide-in animations for messages
- **Responsive Design** - Adapts to all screen sizes
- **Custom Scrollbars** - Styled scrollbars for better UX
- **Hover Effects** - Interactive button animations

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

**Frontend won't connect to backend:**
- Ensure the FastAPI backend is running on port 4002
- Check that CORS is properly configured
- Verify the API endpoint URL in App.js

**Styling issues:**
- Clear browser cache
- Ensure all CSS files are loaded
- Check browser developer tools for errors

**Docker issues:**
- Ensure Docker and Docker Compose are installed
- Check that ports 3000 and 4001 are available
- Run `docker-compose logs` to see error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
