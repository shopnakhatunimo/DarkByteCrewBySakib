const randomstring = require('randomstring');
const moment = require('moment');
const geoip = require('geoip-lite');

class Helpers {
    
    generateRandomString(length) {
        return randomstring.generate({
            length: length,
            charset: 'alphanumeric'
        });
    }

    formatDate(date, includeTime = false) {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (includeTime) {
            return d.toLocaleString('bn-BD', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return d.toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleTimeString('bn-BD', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatDateForFile() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    }

    timeAgo(date) {
        if (!date) return 'N/A';
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return `${diffSec} সেকেন্ড আগে`;
        if (diffMin < 60) return `${diffMin} মিনিট আগে`;
        if (diffHour < 24) return `${diffHour} ঘন্টা আগে`;
        if (diffDay < 30) return `${diffDay} দিন আগে`;
        return this.formatDate(date);
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    getIpInfo(ip) {
        if (!ip || ip === '::1' || ip === '127.0.0.1') {
            return {
                country: 'Local',
                city: 'Local',
                ll: [0, 0]
            };
        }
        
        const geo = geoip.lookup(ip);
        if (geo) {
            return {
                country: geo.country,
                city: geo.city,
                ll: geo.ll
            };
        }
        
        return {
            country: 'Unknown',
            city: 'Unknown',
            ll: [0, 0]
        };
    }

    getUserAgentInfo(uaString) {
        const ua = require('express-useragent').parse(uaString);
        return {
            browser: ua.browser,
            version: ua.version,
            os: ua.os,
            platform: ua.platform,
            isMobile: ua.isMobile,
            isDesktop: ua.isDesktop,
            isTablet: ua.isTablet
        };
    }

    extractClientIp(req) {
        const ip = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket.remoteAddress;
        
        return ip.split(',')[0].trim();
    }

    async getNetworkInfo(ip) {
        try {
            if (process.env.IPINFO_TOKEN) {
                const axios = require('axios');
                const response = await axios.get(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`);
                return {
                    isp: response.data.org,
                    network: response.data.asn,
                    timezone: response.data.timezone
                };
            }
        } catch (error) {
            console.error('IP info error:', error);
        }
        
        return {
            isp: 'Unknown',
            network: 'Unknown',
            timezone: 'Unknown'
        };
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    truncate(str, length) {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

module.exports = new Helpers();