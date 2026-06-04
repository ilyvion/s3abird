<template>
    <div ref="wizardEl" class="flex w-full flex-col gap-4">
        <template v-for="(child, _index) in slots.default?.()" :key="_index">
            <component :is="child" />
        </template>

        <!-- Step indicators -->
        <ul class="steps steps-vertical lg:steps-horizontal lg:w-full lg:ps-0">
            <li
                v-for="({ step }, index) in activeSteps"
                v-bind="getStepProps(step)"
                :key="index"
                class="step"
                :class="{
                    [step.colorClass || props.stepColorClass]: index <= activeStep,
                    'cursor-pointer': isStepReachable(index),
                    'cursor-not-allowed': !isStepReachable(index),
                    'text-base-content/50': !isStepReachable(index),
                }"
                @click="tryGoToStep(index)"
            >
                <template v-if="step.stepIcon?.type === 'icon'">
                    <span class="step-icon">{{ step.stepIcon.icon }}</span>
                </template>
                <span>{{ step.title }}</span>
            </li>
        </ul>

        <!-- Navigation buttons -->
        <div class="mt-4 flex justify-between">
            <button class="btn" :disabled="isFirstStep" @click="prevStep">Previous</button>
            <button
                v-if="!isLastStep"
                class="btn btn-primary"
                :disabled="!canGoNext"
                @click="nextStep"
            >
                Next
            </button>
            <button v-else class="btn btn-success" :disabled="!canGoNext" @click="finishWizard">
                Finish
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    ref,
    computed,
    type Ref,
    nextTick,
    useSlots,
    type VNode,
    provide,
    type InjectionKey,
} from 'vue'
import type { Step } from './AppWizardStep.vue'

const allSteps = ref<Step[]>([])
function registerStep(step: Step) {
    return allSteps.value.push(step) - 1
}
const activeSteps = computed(() => {
    return allSteps.value
        .map((step, index) => ({
            step,
            rawIndex: index,
        }))
        .filter(({ step }) => (step.isVisible ? step.isVisible() : true))
})

const activeStep = ref(0)
const activeStepRawIndex = computed(() => activeSteps.value[activeStep.value]?.rawIndex)

provide(AppWizardStepRegistrationKey, registerStep)
provide(AppWizardActiveStepRawIndexKey, activeStepRawIndex)

const slots = useSlots()
const props = defineProps({
    stepColorClass: {
        type: String,
        default: 'step-primary',
    },
})

const wizardEl = ref<HTMLElement | null>(null)

const isFirstStep = computed(() => activeStep.value === 0)
const isLastStep = computed(() => activeStep.value === activeSteps.value.length - 1)

const canGoNext = computed(() => {
    if (activeSteps.value.length === 0) {
        return false
    }

    const step = activeSteps.value[activeStep.value].step
    return step.isReady ? step.isReady() : true
})

function nextStep() {
    if (!isLastStep.value) {
        goToStep(activeStep.value + 1)
    }
}

function prevStep() {
    if (!isFirstStep.value) {
        goToStep(activeStep.value - 1)
    }
}

async function goToStep(index: number) {
    if (index >= 0 && index < activeSteps.value.length) {
        const currentStep = activeSteps.value[activeStep.value]
        currentStep.step.onExit?.()
        activeStep.value = index

        await nextTick()

        const newStep = activeSteps.value[activeStep.value]
        newStep.step.onEnter?.()
        scrollToTop()
    }
}

function isStepReachable(index: number) {
    if (index <= activeStep.value) {
        return true
    }
    return activeSteps.value
        .slice(0, index)
        .every(({ step }) => (step.isReady ? step.isReady() : true))
}

function tryGoToStep(index: number) {
    if (index < activeStep.value) {
        goToStep(index)
    } else if (index === activeStep.value) {
        return
    } else {
        const allReady = activeSteps.value
            .slice(activeStep.value, index)
            .every(({ step }) => (step.isReady ? step.isReady() : true))

        if (allReady) {
            goToStep(index)
        }
    }
}

function finishWizard() {
    const step = activeSteps.value[activeStep.value]?.step
    step?.onFinished?.()
}

function scrollToTop() {
    let el: HTMLElement | null = wizardEl.value?.parentElement ?? null
    while (el) {
        const overflowY = getComputedStyle(el).overflowY
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            el.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        el = el.parentElement
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function getStepProps(step: Step) {
    if (step.stepIcon?.type === 'data') {
        return { 'data-content': step.stepIcon.data }
    }
    return {}
}
</script>
<script lang="ts">
export type StepInfo = Step & {
    content: () => VNode[]
}
export const AppWizardStepRegistrationKey: InjectionKey<(step: Step) => number> = Symbol(
    'AppWizardStepRegistration'
)
export const AppWizardActiveStepRawIndexKey: InjectionKey<Ref<number>> =
    Symbol('AppWizardActiveStep')
</script>
