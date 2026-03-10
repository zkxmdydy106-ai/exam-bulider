const ghpages = require('gh-pages');

// Injecting Git into the PATH for the spawn process
process.env.PATH = process.env.PATH + ';C:\\Program Files\\Git\\cmd';

console.log('Starting deployment to GitHub Pages...');

ghpages.publish('dist', {
    branch: 'gh-pages',
    repo: 'https://github.com/zkxmdydy106-ai/exam-bulider.git',
    message: 'Auto-deployed to GitHub Pages'
}, (err) => {
    if (err) {
        console.error('Deployment failed:', err);
        process.exit(1);
    } else {
        console.log('Published successfully to GitHub Pages!');
    }
});
