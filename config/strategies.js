const _ = require('lodash');

module.exports = [
    {
        name: 'snapchat',
        package: 'passport-snapchat',
        label: 'Snapchat',
        options: {
            clientID: process.env.SNAPCHAT_ID,
            clientSecret: process.env.SNAPCHAT_SECRET,
            profileFields: ['id', 'displayName', 'bitmoji'],
            scope: ['user.display_name', 'user.bitmoji.avatar'],
        },
        mapUser: (user, profile) => {
            user.email = user.email || `${profile.id}@snapchat.com`;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile.bitmoji.avatarUrl;
        }
    },
    {
        name: 'facebook',
        package: 'passport-facebook',
        label: 'Facebook',
        options: {
            clientID: process.env.FACEBOOK_ID,
            clientSecret: process.env.FACEBOOK_SECRET,
            profileFields: ['name', 'email', 'link', 'locale', 'timezone', 'gender'],
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || `${profile.name.givenName} ${profile.name.familyName}`;
            user.profile.gender = user.profile.gender || profile._json.gender;
            user.profile.picture = user.profile.picture || `https://graph.facebook.com/${profile.id}/picture?type=large`;
            // user.profile.location = user.profile.location || (profile._json.location) ? profile._json.location.name : '';
        }
    },
    {
        name: 'slack',
        package: 'passport-slack',
        label: 'Slack',
        options: {
            clientID: process.env.SLACK_ID,
            clientSecret: process.env.SLACK_SECRET,
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile.user.email;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile.user.image_512;
        }
    },
    {
        name: 'github',
        package: 'passport-github',
        label: 'GitHub',
        options: {
            clientID: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            scope: ['user:email'],
        },
        mapUser: (user, profile) => {
            user.email = user.email || _.get(_.orderBy(profile.emails, ['primary', 'verified'], ['desc', 'desc']), [0, 'value'], null);
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile._json.avatar_url;
            user.profile.location = user.profile.location || profile._json.location;
            user.profile.website = user.profile.website || profile._json.blog;
        }
    },
    {
        name: 'twitter',
        package: 'passport-twitter',
        label: 'Twitter',
        options: {
            consumerKey: process.env.TWITTER_KEY,
            consumerSecret: process.env.TWITTER_SECRET,
        },
        mapUser: (user, profile) => {
            user.email = user.email || `${profile.username}@twitter.com`;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.location = user.profile.location || profile._json.location;
            user.profile.picture = user.profile.picture || profile._json.profile_image_url_https;
        }
    },
    {
        name: 'linkedin',
        package: 'passport-linkedin-oauth2',
        label: 'LinkedIn',
        options: {
            clientID: process.env.LINKEDIN_ID,
            clientSecret: process.env.LINKEDIN_SECRET,
            scope: ['r_liteprofile', 'r_emailaddress'],
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile.emails[0].value;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile.photos[3].value;
        }
    },
    {
        name: 'instagram',
        package: 'passport-instagram',
        label: 'Instagram',
        options: {
            clientID: process.env.INSTAGRAM_ID,
            clientSecret: process.env.INSTAGRAM_SECRET,
        },
        mapUser: (user, profile) => {
            user.email = user.email || `${profile.username}@instagram.com`;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile._json.data.profile_picture;
            user.profile.website = user.profile.website || profile._json.data.website;
        }
    },
    {
        name: 'microsoft',
        package: 'passport-microsoft',
        label: 'Microsoft',
        options: {
            clientID: process.env.MICROSOFT_ID,
            clientSecret: process.env.MICROSOFT_SECRET,
            scope: ['user.read'],
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.userPrincipalName;
            user.profile.name = user.profile.name || profile.displayName;
        }
    },
    {
        name: 'bitbucket',
        package: 'passport-bitbucket',
        label: 'Bitbucket',
        scope: ['account', 'email'],
        options: {
            consumerKey: process.env.BITBUCKET_ID,
            consumerSecret: process.env.BITBUCKET_SECRET,
        },
        mapUser: (user, profile) => {
            console.log(profile);

            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || profile.displayName;
        }
    },
    {
        name: 'pinterest',
        package: 'passport-pinterest',
        label: 'Pinterest',
        options: {
            clientID: process.env.PINTEREST_ID,
            clientSecret: process.env.PINTEREST_SECRET,
            scope: ['read_public'],
            state: true
        },
        mapUser: (user, profile) => {
            console.log(profile);

            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || profile.displayName;
        }
    }, {
        name: 'spotify',
        package: 'passport-spotify',
        label: 'Spotify',
        options: {
            clientID: process.env.SPOTIFY_ID,
            clientSecret: process.env.SPOTIFY_SECRET,
            scope: ['user-read-email', 'user-read-private']
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.email || `${profile.username}@spotify.com`;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile.photos[0];
            user.profile.website = user.profile.website || profile.profileUrl;
        }
    }, {
        name: 'amazon',
        package: 'passport-amazon',
        label: 'Amazon',
        options: {
            clientID: process.env.AMAZON_ID,
            clientSecret: process.env.AMAZON_SECRET,
            scope: ['profile', 'postal_code']
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || profile.displayName;
        }
    }, {
        name: 'dropbox',
        package: 'passport-dropbox-oauth2',
        label: 'Dropbox',
        options: {
            apiVersion: '2',
            clientID: process.env.DROPBOX_ID,
            clientSecret: process.env.DROPBOX_SECRET,
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile._json.profile_photo_url;
        }
    }, {
        name: 'gitlab',
        package: 'passport-gitlab2',
        label: 'Gitlab',
        options: {
            clientID:  process.env.GITLAB_ID,
            clientSecret:  process.env.GITLAB_SECRET,
            scope: ['read_user']
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || profile.displayName;
            user.profile.picture = user.profile.picture || profile.avatarUrl;
            user.profile.website = user.profile.website || profile.profileUrl;
        }
    }, {
        name: 'asana',
        package: 'passport-asana',
        label: 'Asana',
        options: {
            clientID:  process.env.ASANA_ID,
            clientSecret:  process.env.ASANA_SECRET,
            scope: ['default', 'email', 'profile']
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile._json.email;
            user.profile.name = user.profile.name || profile.displayName;
        }
    }, {
        name: 'discord',
        package: 'passport-discord',
        label: 'Discord',
        options: {
            clientID:  process.env.DISCORD_ID,
            clientSecret:  process.env.DISCORD_SECRET,
            scope: ['identify', 'email']
        },
        mapUser: (user, profile) => {
            user.email = user.email || profile.email;
            user.profile.name = user.profile.name || profile.username;
            user.profile.picture = user.profile.picture || `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
            
        }
    },
]