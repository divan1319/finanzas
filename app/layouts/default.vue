<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
const { openNewExpenseModal, openIncomeModal, triggerRefresh } = useFinanzas()
const toast = useToast()

const mobileMenuOpen = ref(false)
const seeding = ref(false)
const confirmResetModalOpen = ref(false)
const resetting = ref(false)

// Cerrar menú móvil al navegar
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Dashboard',
    to: '/',
    icon: 'i-lucide-layout-dashboard',
    active: route.path === '/'
  },
  {
    label: 'Gastos',
    to: '/gastos',
    icon: 'i-lucide-receipt',
    active: route.path.startsWith('/gastos')
  },
  {
    label: 'Ingresos y Nómina',
    to: '/ingresos',
    icon: 'i-lucide-wallet',
    active: route.path.startsWith('/ingresos')
  },
  {
    label: 'Historial',
    to: '/historial',
    icon: 'i-lucide-history',
    active: route.path.startsWith('/historial')
  },
  {
    label: 'Reconciliación',
    to: '/reconciliacion',
    icon: 'i-lucide-scale',
    active: route.path.startsWith('/reconciliacion')
  },
  {
    label: 'Configuración',
    to: '/configuracion',
    icon: 'i-lucide-settings',
    active: route.path.startsWith('/configuracion')
  }
])

const actionItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Nuevo Gasto',
      icon: 'i-lucide-plus-circle',
      onSelect: () => openNewExpenseModal()
    },
    {
      label: 'Registrar Nómina / Ingreso',
      icon: 'i-lucide-wallet',
      onSelect: () => openIncomeModal()
    }
  ],
  [
    {
      label: 'Cargar Datos Demo',
      icon: 'i-lucide-sparkles',
      onSelect: () => seedDemo()
    },
    {
      label: 'Limpiar Base de Datos',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => {
        confirmResetModalOpen.value = true
      }
    }
  ]
])

// Atajo de teclado para nuevo gasto
defineShortcuts({
  n: () => openNewExpenseModal()
})

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
  } catch (err: unknown) {
    toast.add({
      title: 'Error',
      description: err instanceof Error ? err.message : 'No se pudieron cargar los datos de prueba.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
  } finally {
    seeding.value = false
  }
}

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
  } catch (err: unknown) {
    toast.add({
      title: 'Error al limpiar datos',
      description: err instanceof Error ? err.message : 'Ocurrió un problema.',
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
    <!-- Barra de Navegación Superior -->
    <header class="sticky top-0 z-40 w-full border-b border-default/40 bg-background/80 backdrop-blur-md transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Logo / Marca -->
        <NuxtLink
          to="/"
          class="flex items-center gap-3 group shrink-0 focus-visible:outline-none"
        >
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/10 group-hover:scale-105 group-hover:shadow-emerald-500/20 transition-all duration-300">
            <UIcon
              name="i-lucide-credit-card"
              class="w-5 h-5"
            />
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-black text-base tracking-tight text-foreground group-hover:text-primary transition-colors">Control Tarjetas</span>
              <UBadge
                size="xs"
                variant="subtle"
                color="primary"
                class="hidden sm:inline-flex text-[10px] px-1.5 py-0 font-medium"
              >Finanzas</UBadge>
            </div>
            <span class="text-[11px] text-muted -mt-0.5 hidden sm:block">Período de Nómina Activo</span>
          </div>
        </NuxtLink>

        <!-- Navegación de Escritorio (UNavigationMenu) -->
        <div class="hidden lg:flex items-center justify-center flex-1 max-w-2xl px-4">
          <UNavigationMenu
            :items="navItems"
            variant="pill"
            highlight
            class="justify-center"
          />
        </div>

        <!-- Acciones Rápidas y Utilidades (Escritorio y Tablet) -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <!-- Botón Nuevo Gasto -->
          <UButton
            size="sm"
            color="primary"
            icon="i-lucide-plus"
            label="Nuevo Gasto"
            class="font-semibold shadow-xs hidden sm:inline-flex"
            @click="openNewExpenseModal()"
          >
            <template #trailing>
              <UKbd
                value="N"
                variant="subtle"
                class="text-[10px] hidden md:inline-flex opacity-80"
              />
            </template>
          </UButton>

          <!-- Menú Desplegable de Acciones Rápidas (Desktop) -->
          <UDropdownMenu :items="actionItems">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-lucide-more-vertical"
              aria-label="Más acciones"
              class="hidden sm:inline-flex"
            />
          </UDropdownMenu>

          <!-- Botón de Modo Oscuro / Claro -->
          <UColorModeButton />

          <!-- Botón Menú Móvil (Hamburguesa) -->
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-menu"
            aria-label="Abrir menú"
            class="lg:hidden"
            @click="mobileMenuOpen = true"
          />
        </div>
      </div>
    </header>

    <!-- Menú Lateral Desplegable Móvil (Slideover) -->
    <USlideover
      v-model:open="mobileMenuOpen"
      title="Control Tarjetas"
      description="Gestión financiera activa"
      :ui="{
        header: 'border-b border-default/40 py-4 px-5',
        body: 'p-5 space-y-6',
        footer: 'border-t border-default/40 py-4 px-5'
      }"
    >
      <template #body>
        <div class="space-y-6">
          <!-- Vistas Principales -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted px-2.5">
              Navegación
            </span>
            <UNavigationMenu
              :items="navItems"
              orientation="vertical"
              class="-mx-2.5"
            />
          </div>

          <!-- Acciones Rápidas -->
          <div class="space-y-2.5 pt-4 border-t border-default/40">
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted px-2.5">
              Acciones Rápidas
            </span>
            <div class="grid grid-cols-1 gap-2">
              <UButton
                color="primary"
                icon="i-lucide-plus"
                label="Registrar Gasto"
                block
                class="font-semibold"
                @click="() => { mobileMenuOpen = false; openNewExpenseModal(); }"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-wallet"
                label="Registrar Ingreso / Nómina"
                block
                @click="() => { mobileMenuOpen = false; openIncomeModal(); }"
              />
            </div>
          </div>

          <!-- Herramientas y Datos -->
          <div class="space-y-2.5 pt-4 border-t border-default/40">
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted px-2.5">
              Herramientas de Datos
            </span>
            <div class="flex flex-col gap-2">
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-sparkles"
                label="Cargar Datos Demo"
                :loading="seeding"
                block
                @click="() => { mobileMenuOpen = false; seedDemo(); }"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                label="Limpiar Base de Datos"
                block
                @click="() => { mobileMenuOpen = false; confirmResetModalOpen = true; }"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2 text-xs text-muted">
            <UIcon
              name="i-lucide-sun-moon"
              class="w-4 h-4"
            />
            <span>Tema visual</span>
          </div>
          <UColorModeButton />
        </div>
      </template>
    </USlideover>

    <!-- Contenido Principal -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
      <slot />
    </main>

    <!-- Barra Inferior Móvil (Mobile Bottom Dock) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-lg border-t border-default/40 px-3 py-2">
      <div class="flex items-center justify-around">
        <!-- Dashboard -->
        <NuxtLink
          to="/"
          class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200"
          :class="route.path === '/' ? 'text-primary font-semibold' : 'text-muted hover:text-foreground'"
        >
          <UIcon
            name="i-lucide-layout-dashboard"
            class="w-5 h-5"
          />
          <span class="text-[10px] leading-none">Inicio</span>
        </NuxtLink>

        <!-- Gastos -->
        <NuxtLink
          to="/gastos"
          class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200"
          :class="route.path.startsWith('/gastos') ? 'text-primary font-semibold' : 'text-muted hover:text-foreground'"
        >
          <UIcon
            name="i-lucide-receipt"
            class="w-5 h-5"
          />
          <span class="text-[10px] leading-none">Gastos</span>
        </NuxtLink>

        <!-- Botón Central Nuevo Gasto -->
        <div class="-mt-5">
          <button
            type="button"
            class="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            aria-label="Nuevo Gasto"
            @click="openNewExpenseModal()"
          >
            <UIcon
              name="i-lucide-plus"
              class="w-6 h-6"
            />
          </button>
        </div>

        <!-- Ingresos -->
        <NuxtLink
          to="/ingresos"
          class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200"
          :class="route.path.startsWith('/ingresos') ? 'text-primary font-semibold' : 'text-muted hover:text-foreground'"
        >
          <UIcon
            name="i-lucide-wallet"
            class="w-5 h-5"
          />
          <span class="text-[10px] leading-none">Ingresos</span>
        </NuxtLink>

        <!-- Más (Abre Slideover) -->
        <button
          type="button"
          class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 text-muted hover:text-foreground cursor-pointer"
          :class="mobileMenuOpen ? 'text-primary font-semibold' : ''"
          @click="mobileMenuOpen = true"
        >
          <UIcon
            name="i-lucide-grid"
            class="w-5 h-5"
          />
          <span class="text-[10px] leading-none">Más</span>
        </button>
      </div>
    </nav>

    <!-- Footer (Escritorio y Tablet) -->
    <footer class="hidden md:block border-t border-default/40 py-6 text-center text-xs text-muted">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>Control de Tarjeta Activa y Finanzas Personales • Daniel</p>
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/configuracion"
            class="hover:underline"
          >Configuración</NuxtLink>
          <NuxtLink
            to="/reconciliacion"
            class="hover:underline"
          >Reconciliación</NuxtLink>
          <NuxtLink
            to="/historial"
            class="hover:underline"
          >Historial</NuxtLink>
        </div>
      </div>
    </footer>

    <!-- Modal de Confirmación para Limpiar Datos -->
    <UModal
      v-model:open="confirmResetModalOpen"
      title="¿Borrar todos los movimientos?"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Esta acción eliminará todos los <strong>gastos</strong>, <strong>ingresos de nómina</strong> y <strong>reconciliaciones</strong> registradas.
            Tu configuración y parámetros de tarjetas se mantendrán intactos.
          </p>
          <p class="text-xs text-muted">
            Úsalo si terminaste de probar los datos demo y deseas empezar a registrar tu información personal desde cero.
          </p>
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-default/40">
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
