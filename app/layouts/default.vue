<script setup lang="ts">
const route = useRoute()
const { openNewExpenseModal, openIncomeModal, triggerRefresh } = useFinanzas()
const toast = useToast()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Gastos', to: '/gastos', icon: 'i-lucide-receipt' },
  { label: 'Nómina e Ingresos', to: '/ingresos', icon: 'i-lucide-wallet' },
  { label: 'Historial Períodos', to: '/historial', icon: 'i-lucide-history' },
  { label: 'Reconciliación', to: '/reconciliacion', icon: 'i-lucide-scale' },
  { label: 'Configuración', to: '/configuracion', icon: 'i-lucide-settings' }
]

const seeding = ref(false)
const seedDemo = async () => {
  seeding.value = true
  try {
    await $fetch('/api/seed-demo', { method: 'POST' })
    toast.add({
      title: 'Datos Demo Cargados',
      description: 'Se han generado gastos, nóminas y reconciliaciones de ejemplo.',
      color: 'success',
      icon: 'i-lucide-sparkles'
    })
    triggerRefresh()
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message || 'No se pudieron cargar los datos de prueba.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
  } finally {
    seeding.value = false
  }
}

const confirmResetModalOpen = ref(false)
const resetting = ref(false)

const resetData = async () => {
  resetting.value = true
  try {
    await $fetch('/api/reset-data', { method: 'POST' })
    toast.add({
      title: 'Datos Eliminados',
      description: 'La base de datos está limpia. Puedes empezar a registrar tus datos reales.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    confirmResetModalOpen.value = false
    triggerRefresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al limpiar datos',
      description: err?.message || 'Ocurrió un problema.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
    <!-- Barra Superior -->
    <header class="sticky top-0 z-40 w-full border-b border-muted/20 bg-background/80 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Logo / Marca -->
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <UIcon name="i-lucide-credit-card" class="w-5 h-5" />
          </div>
          <div>
            <span class="font-black text-base tracking-tight block">Control Tarjetas</span>
          </div>
        </NuxtLink>

        <!-- Navegación de Escritorio -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            :class="[
              route.path === item.to
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted hover:text-foreground hover:bg-muted/10'
            ]"
          >
            <UIcon :name="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Botones de Acción y Utilidades -->
        <div class="flex items-center gap-2 sm:gap-3">
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-sparkles"
            label="Datos Demo"
            class="hidden sm:inline-flex text-xs"
            :loading="seeding"
            @click="seedDemo"
          />

          <UButton
            size="sm"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            label="Limpiar Datos"
            class="hidden sm:inline-flex text-xs"
            @click="confirmResetModalOpen = true"
          />

          <UButton
            size="sm"
            color="primary"
            icon="i-lucide-plus"
            label="Nuevo Gasto"
            class="font-semibold shadow-xs"
            @click="openNewExpenseModal()"
          />

          <UColorModeButton />
        </div>
      </div>

      <!-- Navegación Móvil Horizontal Scrollable -->
      <div class="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-muted/10 no-scrollbar">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap flex items-center gap-1.5 shrink-0"
          :class="[
            route.path === item.to
              ? 'bg-primary/15 text-primary font-semibold'
              : 'text-muted hover:text-foreground'
          ]"
        >
          <UIcon :name="item.icon" class="w-3.5 h-3.5" />
          <span>{{ item.label }}</span>
        </NuxtLink>

        <button
          type="button"
          class="px-2.5 py-1 text-xs text-error font-medium whitespace-nowrap flex items-center gap-1 shrink-0"
          @click="confirmResetModalOpen = true"
        >
          <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
          <span>Limpiar</span>
        </button>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-muted/20 py-6 text-center text-xs text-muted">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>Control de Tarjeta Activa y Finanzas Personales • Daniel</p>
        <div class="flex items-center gap-4">
          <NuxtLink to="/configuracion" class="hover:underline">Configuración</NuxtLink>
          <NuxtLink to="/reconciliacion" class="hover:underline">Reconciliación</NuxtLink>
        </div>
      </div>
    </footer>

    <!-- Modal de Confirmación para Limpiar Datos -->
    <UModal v-model:open="confirmResetModalOpen" title="¿Borrar todos los movimientos?">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Esta acción eliminará todos los <strong>gastos</strong>, <strong>ingresos de nómina</strong> y <strong>reconciliaciones</strong> registradas.
            Tu configuración y parámetros de tarjetas se mantendrán intactos.
          </p>
          <p class="text-xs text-muted">
            Úsalo si terminaste de probar los datos demo y deseas empezar a registrar tu información personal desde cero.
          </p>
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancelar"
              @click="confirmResetModalOpen = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Sí, borrar todo"
              :loading="resetting"
              @click="resetData"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
