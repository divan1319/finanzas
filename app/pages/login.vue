<script setup lang="ts">
definePageMeta({
  layout: false
})

const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!password.value.trim()) {
    errorMessage.value = 'Por favor ingresa la contraseña'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value }
    })

    // Actualizar estado reactivo de la sesión en el cliente
    await refreshSession()

    toast.add({
      title: '¡Bienvenido!',
      description: 'Acceso autorizado al panel financiero.',
      color: 'success',
      icon: 'i-lucide-shield-check'
    })

    await navigateTo('/')
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Contraseña incorrecta. Inténtalo de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-primary-500 selection:text-white">
    <!-- Ambient Background Lighting -->
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

    <div class="w-full max-w-md relative z-10">
      <!-- Header Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-800 to-indigo-500/20 border border-slate-700/60 shadow-xl shadow-emerald-500/5 mb-4 group">
          <UIcon name="i-lucide-wallet" class="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Finanzas Personales
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
          Acceso privado al control de nóminas y tarjetas
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Password Input -->
          <div class="space-y-2">
            <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Contraseña de Acceso
            </label>
            <div class="relative">
              <UInput
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Ingresa tu clave maestra o PIN"
                icon="i-lucide-lock"
                size="xl"
                class="w-full font-mono text-sm"
                autofocus
                :disabled="loading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                tabindex="-1"
              >
                <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400 animate-shake"
          >
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0 text-red-400" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Submit Button -->
          <UButton
            type="submit"
            color="primary"
            size="xl"
            block
            :loading="loading"
            class="font-semibold shadow-lg shadow-primary-500/20"
          >
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4 ml-1" />
            <span>Desbloquear App</span>
          </UButton>
        </form>

        <div class="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span class="flex items-center gap-1.5">
            <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5 text-emerald-400" />
            Sesión segura de 60 días
          </span>
          <span class="text-slate-400">PWA Protegida</span>
        </div>
      </div>
    </div>
  </div>
</template>
