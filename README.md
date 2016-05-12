# Expensa

An email robot for tracking receipts and tax documents.

# How it works

Once you set this up you'll have a collection of email addresses of the form
`<category>@<money.your.domain>` that you can send receipts and tax documents
to. The subject line of your emails should be of the form `<amount>: <description>`
for receipts and just `<description>` for tax documents that don't have an amount.

The bot will append rows of the form <date>, <category>, (<amount>), <description> to a google
spreadsheet.

# Setup

Because this is basically just a bunch of glue around external services setup is
a bit involved. Here's what you need to do.

1. Fork the project and check it out on your own machine.

1. Get Heroku setup on your computer as per the first two steps of:

https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction

1. Create a Heroku app:

```
> heroku apps:create <your.app.name>
```

1. Set the endpoint secret:

```
> heroku config:set ENDPOINT_SECRET=<long random string of lowercase letters>
```

1. Open a Mailgun account and configure a domain. Don't forget to add DNS records
for receiving mail.

1. Create a `catch_all()` route that forwards messages to wherever your want
the full messages archived as well as your app:
`http://<your.app.name>.heroku.com/<ENDPOINT_SECRET>`

1. Give Heroku access to Mailgun by setting the following keys:

```
heroku config:set MAILGUN_DOMAIN=<money.your.domain>
heroku config:set MAILGUN_API_LEY=<YourMailgunAPIKey>
```
