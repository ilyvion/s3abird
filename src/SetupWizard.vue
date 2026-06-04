<template>
    <div>
        <h2 class="mb-2 text-2xl font-semibold">
            {{ isAddMode ? 'Add Another Bucket' : 'Setup' }}
        </h2>
        <div class="prose mx-auto">
            <AppWizard>
                <!-- ── Step 1: Introduction ─────────────────────────── -->
                <AppWizardStep title="Introduction" :is-ready="() => selectedMode !== ''">
                    <template v-if="isAddMode">
                        <h3>Add Another Bucket</h3>
                        <p>
                            This wizard will help you add another S3 bucket — with its own AWS
                            credentials — to s3abird. You can run through the guided steps to set
                            everything up in AWS, or jump straight to entering the details if you
                            already have them.
                        </p>
                    </template>
                    <template v-else>
                        <h3>Introduction</h3>
                        <h4>What is s3abird?</h4>
                        <p>
                            It's a webmail client for viewing emails stored in
                            <a href="https://aws.amazon.com/s3/" target="_blank"
                                >Amazon <span title="Simple Storage Service">S3</span></a
                            >
                            buckets.
                        </p>
                        <p>
                            The purpose of this project is to give an easy interface for browsing
                            through and reading emails received via
                            <a href="https://aws.amazon.com/ses/" target="_blank"
                                >Amazon <span title="Simple Email Service">SES</span></a
                            >
                            stored in S3 buckets, although it will work on any buckets containing
                            raw emails.
                        </p>
                        <p>
                            Emails are fetched and cached directly in your browser and never pass
                            through our server, so your emails stay private and confidential.
                        </p>
                    </template>
                    <p>How would you like to proceed?</p>
                    <ul class="not-prose flex flex-col gap-3">
                        <li>
                            <label class="flex cursor-pointer items-start gap-2">
                                <input
                                    v-model="selectedMode"
                                    type="radio"
                                    name="wizard-mode"
                                    class="radio mt-1"
                                    value="wizard"
                                />
                                <div>
                                    <div class="font-medium">Guide me through the setup</div>
                                    <div class="text-base-content/70 text-sm">
                                        Step-by-step instructions for configuring an S3 bucket,
                                        setting up an IAM policy, an IAM user, and access keys. Best
                                        if you're new to AWS or setting up s3abird access for the
                                        first time.
                                    </div>
                                </div>
                            </label>
                        </li>
                        <li>
                            <label class="flex cursor-pointer items-start gap-2">
                                <input
                                    v-model="selectedMode"
                                    type="radio"
                                    name="wizard-mode"
                                    class="radio mt-1"
                                    value="expert"
                                />
                                <div>
                                    <div class="font-medium">I have already configured AWS</div>
                                    <div class="text-base-content/70 text-sm">
                                        Skip straight to entering your bucket name, region, and AWS
                                        access keys. Best if you've already configured everything in
                                        AWS.
                                    </div>
                                </div>
                            </label>
                        </li>
                    </ul>
                </AppWizardStep>

                <!-- ── Guided wizard steps ─────────────────────────── -->
                <AppWizardStepGroup :is-visible="() => selectedMode === 'wizard'">
                    <!-- Step 2: S3 Bucket -->
                    <AppWizardStep
                        title="S3 Bucket"
                        :is-ready="() => bucket.length > 0 && region.length > 0"
                    >
                        <h3>S3 Bucket</h3>
                        <p>
                            First, we need the name and region of the S3 bucket that holds your
                            emails. If you haven't created a bucket yet, go to
                            <a href="https://s3.console.aws.amazon.com/s3/buckets" target="_blank"
                                >S3 in the AWS console</a
                            >
                            and create one.
                        </p>
                        <label class="floating-label">
                            <input
                                v-model="bucket"
                                class="input w-full"
                                placeholder="S3 bucket name"
                            />
                            <span>S3 bucket name</span>
                        </label>
                        <label class="floating-label mt-4">
                            <select v-model="region" class="select w-full">
                                <option value="" disabled>Select a region…</option>
                                <option v-for="r in regions" :key="r.code" :value="r.code">
                                    {{ r.name }} — {{ r.code }}
                                </option>
                            </select>
                            <span>AWS region</span>
                        </label>
                        <p>
                            If your emails are stored under a common path prefix inside the bucket
                            (e.g. <code>emails/</code>), enter it here. Otherwise leave it blank.
                        </p>
                        <label class="floating-label">
                            <input
                                v-model="prefix"
                                class="input w-full"
                                placeholder="S3 Key prefix (optional)"
                            />
                            <span>S3 Key prefix (optional)</span>
                        </label>

                        <h4>CORS policy</h4>
                        <p>
                            The bucket needs a CORS policy so your browser will be allowed to access
                            your S3 bucket from our URL. In the
                            <a
                                v-if="region"
                                :href="`https://s3.console.aws.amazon.com/s3/buckets/${bucket}?region=${region}&tab=permissions`"
                                target="_blank"
                                >AWS console, open your bucket</a
                            ><span
                                v-else
                                class="cursor-help font-semibold underline decoration-dotted"
                                title="This becomes a link once you select your region above"
                                >AWS console, open your bucket</span
                            >
                            and go to <em>Permissions</em> →
                            <em>Cross-origin resource sharing (CORS)</em>, click <em>Edit</em> and
                            paste the following:
                        </p>
                        <JsonBlock :json="bucketCorsJson" />
                        <details class="bg-base-200 rounded-box collapse-arrow collapse mt-2">
                            <summary class="collapse-title font-medium">
                                What does this policy do?
                            </summary>
                            <div class="collapse-content prose">
                                <p>
                                    This is a
                                    <a
                                        href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS"
                                        target="_blank"
                                        >CORS</a
                                    >
                                    (Cross-Origin Resource Sharing) policy. Browsers enforce a
                                    same-origin policy that blocks a web page from making requests
                                    to a different domain. Since s3abird is served from
                                    <code>{{ currentOrigin }}</code> but your emails live in S3, AWS
                                    must explicitly permit this cross-origin access.
                                </p>
                                <p>
                                    The policy above only permits <strong>GET</strong> requests
                                    (read-only), restricts <code>AllowedOrigins</code> to exactly
                                    this s3abird deployment URL so no other site can piggyback on
                                    it, and permits all request headers so the AWS SDK can
                                    authenticate. No writes, deletes, or uploads are possible
                                    through this policy alone.
                                </p>
                            </div>
                        </details>
                    </AppWizardStep>

                    <!-- Step 3: IAM Policy -->
                    <AppWizardStep title="IAM Policy" :on-enter="updateIamPolicyJson">
                        <h3>IAM Policy</h3>
                        <p>
                            Create an IAM policy that grants read access to your bucket. Go to
                            <a
                                href="https://console.aws.amazon.com/iam/home#/policies"
                                target="_blank"
                                >IAM → Policies</a
                            >, click <strong>Create policy</strong>, switch to the
                            <strong>JSON</strong> tab, and paste the following:
                        </p>
                        <JsonBlock :json="iamPolicyJson" />
                        <details class="bg-base-200 rounded-box collapse-arrow collapse mt-2">
                            <summary class="collapse-title font-medium">
                                What does this policy do?
                            </summary>
                            <div class="collapse-content prose">
                                <p>
                                    This IAM policy grants the minimum permissions s3abird needs to
                                    read your emails:
                                </p>
                                <ul>
                                    <li>
                                        <strong>s3:ListBucket</strong> — lets s3abird list the
                                        objects (emails) stored in the bucket.
                                    </li>
                                    <li>
                                        <strong>s3:GetObject</strong> — lets s3abird download
                                        individual email files to display them.
                                    </li>
                                </ul>
                                <p>
                                    The <code>Resource</code> entries scope these permissions to
                                    only the <code>{{ bucket }}</code> bucket and its contents. No
                                    other buckets or AWS resources in your account are accessible
                                    with this policy.
                                </p>
                            </div>
                        </details>
                        <p>
                            Give the policy a memorable name (e.g.
                            <code>s3abird-{{ bucket }}-read</code>) and finish creating it. You'll
                            attach it to a user in the next step.
                        </p>
                    </AppWizardStep>

                    <!-- Step 4: IAM User -->
                    <AppWizardStep title="IAM User">
                        <h3>IAM User</h3>
                        <p>
                            Create an IAM user that s3abird will authenticate as. Go to
                            <a href="https://console.aws.amazon.com/iam/home#/users" target="_blank"
                                >IAM → Users</a
                            >
                            and click <strong>Create user</strong>.
                        </p>
                        <ol>
                            <li>
                                Give the user a name (e.g. <code>s3abird</code>) and click
                                <strong>Next</strong>.
                            </li>
                            <li>
                                On the permissions page choose
                                <strong>Attach policies directly</strong>, find the policy you
                                created in the previous step, tick it, and click
                                <strong>Next</strong>.
                            </li>
                            <li>Review and click <strong>Create user</strong>.</li>
                        </ol>
                        <p>
                            Once your user is created, proceed to the next step to create an access
                            key for it.
                        </p>
                    </AppWizardStep>

                    <!-- Step 5: Access Keys (last wizard step) -->
                    <AppWizardStep
                        title="Access Keys"
                        :is-ready="() => testStatus === 'success'"
                        :on-finished="finish"
                    >
                        <h3>Access Keys</h3>
                        <ol>
                            <li>
                                Open the newly created user, go to the
                                <strong>Security credentials</strong> tab, and under
                                <strong>Access keys</strong> click
                                <strong>Create access key</strong>.
                            </li>
                            <li>
                                Select <strong>Application running outside AWS</strong> as the use
                                case and proceed.
                            </li>
                            <li>
                                On the final screen, copy both the
                                <strong>Access key ID</strong> and the
                                <strong>Secret access key</strong>. The secret is only shown once —
                                keep it safe.
                            </li>
                        </ol>
                        <p>Enter the access key credentials you just created here:</p>
                        <label class="floating-label">
                            <input
                                v-model="accessKeyId"
                                class="input w-full font-mono"
                                placeholder="Access key ID"
                                autocomplete="off"
                            />
                            <span>Access key ID</span>
                        </label>
                        <label class="floating-label mt-4">
                            <input
                                v-model="secretKey"
                                type="password"
                                class="input w-full font-mono"
                                placeholder="Secret access key"
                                autocomplete="off"
                            />
                            <span>Secret access key</span>
                        </label>
                        <ConnectionTest
                            :disabled="!canTest"
                            :status="testStatus"
                            :error="testError"
                            @test="testConnection"
                        />
                    </AppWizardStep>
                </AppWizardStepGroup>

                <!-- ── Expert mode ─────────────────────────────────── -->
                <AppWizardStep
                    title="Configure"
                    :is-visible="() => selectedMode === 'expert'"
                    :is-ready="() => testStatus === 'success'"
                    :on-finished="finish"
                >
                    <h3>Configure</h3>
                    <p>Enter your bucket details and AWS credentials below.</p>

                    <h4>Bucket</h4>
                    <label class="floating-label">
                        <input v-model="bucket" class="input w-full" placeholder="S3 bucket name" />
                        <span>S3 bucket name</span>
                    </label>
                    <label class="floating-label mt-4">
                        <select v-model="region" class="select w-full">
                            <option value="" disabled>Select a region…</option>
                            <option v-for="r in regions" :key="r.code" :value="r.code">
                                {{ r.name }} — {{ r.code }}
                            </option>
                        </select>
                        <span>AWS region</span>
                    </label>
                    <label class="floating-label mt-4">
                        <input
                            v-model="prefix"
                            class="input w-full"
                            placeholder="S3 Key prefix (optional)"
                        />
                        <span>S3 Key prefix (optional)</span>
                    </label>

                    <h4>Credentials</h4>
                    <label class="floating-label">
                        <input
                            v-model="accessKeyId"
                            class="input w-full font-mono"
                            placeholder="Access key ID"
                            autocomplete="off"
                        />
                        <span>Access key ID</span>
                    </label>
                    <label class="floating-label mt-4">
                        <input
                            v-model="secretKey"
                            type="password"
                            class="input w-full font-mono"
                            placeholder="Secret access key"
                            autocomplete="off"
                        />
                        <span>Secret access key</span>
                    </label>
                    <ConnectionTest
                        :disabled="!canTest"
                        :status="testStatus"
                        :error="testError"
                        @test="testConnection"
                    />
                    <p v-if="testStatus === 'success'">
                        Click <strong>Finish</strong> below to go to your inbox.
                    </p>
                </AppWizardStep>
            </AppWizard>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { useConfigStore } from './stores/config'

import AppWizard from './wizard/AppWizard.vue'
import AppWizardStep from './wizard/AppWizardStep.vue'
import AppWizardStepGroup from './wizard/AppWizardStepGroup.vue'
import JsonBlock from './wizard/JsonBlock.vue'
import ConnectionTest from './wizard/ConnectionTest.vue'
import type { TestStatus } from './wizard/ConnectionTest.vue'

import awsRegions from './aws-regions.json'

type WizardMode = 'wizard' | 'expert'

const configStore = useConfigStore()
const route = useRoute()
const router = useRouter()

const isAddMode = computed(() => route.path === '/setup/add')

if (!isAddMode.value && configStore.config !== null && configStore.allBuckets.length > 0) {
    void router.push('/inbox')
}

const selectedMode = ref<WizardMode | ''>('')

const bucket = ref('')
const region = ref('')
const prefix = ref('')
const accessKeyId = ref('')
const secretKey = ref('')
const regions = awsRegions

const currentOrigin = computed(() => new URL(window.location.href).origin)

const bucketCorsJson = computed(() =>
    JSON.stringify(
        [
            {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET'],
                AllowedOrigins: [currentOrigin.value],
                ExposeHeaders: [],
            },
        ],
        null,
        4
    )
)

const iamPolicyJson = ref('')
function updateIamPolicyJson() {
    iamPolicyJson.value = JSON.stringify(
        {
            Version: '2012-10-17',
            Statement: [
                {
                    Sid: 'AllowBucketRead',
                    Effect: 'Allow',
                    Action: ['s3:ListBucket', 's3:GetObject'],
                    Resource: [`arn:aws:s3:::${bucket.value}`, `arn:aws:s3:::${bucket.value}/*`],
                },
            ],
        },
        null,
        4
    )
}

const testStatus = ref<TestStatus>('idle')
const testError = ref('')

watch([bucket, region, accessKeyId, secretKey], () => {
    testStatus.value = 'idle'
    testError.value = ''
})

const canTest = computed(
    () =>
        bucket.value.length > 0 &&
        region.value.length > 0 &&
        accessKeyId.value.length > 0 &&
        secretKey.value.length > 0 &&
        testStatus.value !== 'testing'
)

async function testConnection() {
    testStatus.value = 'testing'
    testError.value = ''
    try {
        const client = new S3Client({
            region: region.value,
            credentials: {
                accessKeyId: accessKeyId.value,
                secretAccessKey: secretKey.value,
            },
        })
        await client.send(
            new ListObjectsV2Command({
                Bucket: bucket.value,
                Prefix: prefix.value.length > 0 ? prefix.value : undefined,
                MaxKeys: 1,
            })
        )
        testStatus.value = 'success'
    } catch (err) {
        testStatus.value = 'error'
        // TypeError means the request never reached AWS — CORS is misconfigured or we're offline.
        if (err instanceof TypeError) {
            testError.value =
                'Network error: could not reach AWS. This is usually caused by a missing or ' +
                'incorrect CORS policy on the bucket — or you may be offline or otherwise ' +
                'unable to reach the S3 servers.'
        } else {
            testError.value = err instanceof Error ? err.message : String(err)
        }
    }
}

function finish() {
    const newCredential = {
        aws_access_key_id: accessKeyId.value,
        aws_secret_access_key: secretKey.value,
        buckets: [
            {
                aws_region: region.value,
                bucket: bucket.value,
                prefix: prefix.value.length > 0 ? prefix.value : undefined,
            },
        ],
    }

    if (isAddMode.value && configStore.config !== null) {
        configStore.updateConfig({
            credentials: [...configStore.config.credentials, newCredential],
        })
    } else {
        configStore.updateConfig({ credentials: [newCredential] })
    }

    void router.push('/inbox')
}

defineExpose({ finish, testConnection, testStatus, testError })
</script>
