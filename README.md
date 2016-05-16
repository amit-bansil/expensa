# Expensa

An email robot for tracking receipts and tax documents.

# How it works

Once you set this up you'll have a collection of email addresses of the form
`<category>@<your.domain>` that you can send receipts and tax documents
to. The subject line of your emails should be of the form `<amount>: <description>`
for receipts and just `<description>` for tax documents that don't have an amount.

The bot will append rows of the form:

<date>, <sender email>, <category>, (<amount>), <description>, (<link to body>), (link to first attachement...)

to a google spreadsheet.

# Setup

Because this is basically just a bunch of glue around external services setup is
a bit involved. Here's what you need to do.

1. Fork the project and check it out on your own machine.

1. Get Heroku setup on your computer as per the first two steps of:

https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction

1. Create a Heroku app by running the following command in the project dir:

```
> heroku apps:create <your.app.name>
```

1. Set the endpoint secret:

```
> heroku config:set ENDPOINT_SECRET=<long random string of lowercase letters>
```

1. Open a Mailgun account and configure a domain. Don't forget to add DNS records
for receiving mail.

1. Create a `catch_all()` route that forwards messages to your app:
`http://<your.app.name>.heroku.com/<ENDPOINT_SECRET>`

1. Give Heroku access to Mailgun by setting the following keys:

```
heroku config:set MAILGUN_DOMAIN=<money.your.domain>
heroku config:set MAILGUN_API_LEY=<YourMailgunAPIKey>
```

1. Setup google drive api access as per the link below:

https://www.npmjs.com/package/google-spreadsheet-append

Store the following keys that you got while setting up api access in Heroku's
environment as follows:
```
heroku config:set GDRIVE_EMAIL=<service account email>
heroku config:set GRDIVE_KEY="`cat </path/to/key/file.pem>`"
heroku config:set GDRIVE_FILEID=<spreadsheet file id>
```

1. Create an Amazon S3 bucket in the US Standard region and a user with full
access to that bucket. Store the following keys that you got while setting up
api access in Heroku's environment as follows:
```
heroku config:set S3_ACCESS_KEY=<aws iam user access key>
heroku config:set S3_SECRET_KEY=<aws iam user secret api key>
heroku config:set S3_BUCKET=<bucket.name>
```
You can find the s3 region in this table:

http://docs.aws.amazon.com/general/latest/gr/rande.html

Use us-east-1 for US Standard.
