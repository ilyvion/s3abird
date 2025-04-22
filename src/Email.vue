<script setup>
import EmailAddress from './EmailAddress.vue';
</script>
<template>
<div v-if="email">
  <h4>{{ email.subject || '(no subject)' }}</h4>
  <table class="addr">
    <tbody>
      <tr>
        <th scope="row"><EmailAddress :address="email.from" /></th>
      </tr>
      <tr>
        <td scope="row">
            <span class="text-secondary">to </span>
            <template v-for="(addr, index) in email.to" :key="'to-' + index">
                <EmailAddress :address="addr" />
                <span v-if="index < email.to.length - 1">, </span>
            </template>
        </td>
      </tr>
      <tr>
        <td scope="row">
            <span class="text-secondary">cc </span>
            <template v-for="(addr, index) in email.cc" :key="'cc-' + index">
                <EmailAddress :address="addr" />
                <span v-if="index < email.cc.length - 1">, </span>
            </template>
        </td>
      </tr>
      <tr>
        <td scope="row">
          <div class="my-2" v-html="email.html || email.textAsHtml"></div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
</template>

<script>
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import parser from './parser.js';

export default {
    name: 'Email',
    props: {messageId:String},
    data: function () {
        return {
            email: this.$store.state.emails.get(this.messageId)
        };
    },
    computed: {
        key: function () {
            return atob(this.messageId)
        },
        config: function () {
            return this.$store.state.config
        }
    },
    created: function () {
        if (this.email) {
            // email already loaded
            return;
        }

        const s3 = new S3Client({
            region: this.config.aws_region,
            credentials: {
                accessKeyId: this.config.aws_access_key_id,
                secretAccessKey: this.config.aws_secret_access_key,
            }
        });

        s3.send(new GetObjectCommand({
            Bucket: this.config.bucket,
            Key: this.key
        }))
            .then(msg => {
                return parser(msg.Body);
            })
            .then(parsed => {
                this.email = parsed;
            });
    }
}
</script>

<style scoped>
table.addr {
    font-size: 0.875rem;
    letter-spacing: .2px;
}
</style>
