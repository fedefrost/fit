import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import GroupIcon from '@mui/icons-material/Group'
import RemoveIcon from '@mui/icons-material/Remove'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { apiErrorMessage } from '../api/client'
import {
  addShoppingItem,
  checkIngredient,
  deleteShoppingItem,
  getShopping,
  updateShopping,
  updateShoppingItem,
} from '../api/shopping'
import SelectedProfileGate from '../components/SelectedProfileGate'
import { useDiet } from '../context/DietContext'
import { useSelectedProfile } from '../context/SelectedProfileContext'
import { addDaysIso, capitalizeFirst, formatDay } from '../lib/dates'
import { FOOD_CATEGORIES, foodName, sortFoods } from '../lib/foods'
import { profileLabel } from '../lib/profile'
import { normalizeText } from '../lib/recipes'
import { formatShoppingQuantity, MAX_ITEM_TEXT, PEOPLE_RANGE, toggleDay } from '../lib/shopping'

/** Fila con check: tachada y atenuada cuando ya se compró. */
function ShoppingRow({ id, checked, title, amount, detail, onToggle, action }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', py: 0.5, opacity: checked ? 0.55 : 1, transition: 'opacity 150ms' }}
    >
      <Checkbox
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
        slotProps={{ input: { 'aria-labelledby': id } }}
        color="secondary"
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography id={id} sx={{ fontWeight: 600, textDecoration: checked ? 'line-through' : 'none' }}>
          {title}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        )}
      </Box>
      {amount && (
        <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap', textDecoration: checked ? 'line-through' : 'none' }}>
          {amount}
        </Typography>
      )}
      {action}
    </Stack>
  )
}

function ShoppingContent({ label }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { selected } = useSelectedProfile()
  const profileId = selected.profile.id
  const { week, today, foods, foodsById, status: dietStatus } = useDiet()

  const [list, setList] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [newItem, setNewItem] = useState({ value: null, input: '', amount: '' })
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const current = ++requestId.current
    setStatus('loading')
    try {
      const next = await getShopping(profileId, week)
      if (current !== requestId.current) return
      setList(next)
      setStatus('ready')
    } catch (error) {
      if (current !== requestId.current) return
      setLoadError(error)
      setStatus('error')
    }
  }, [profileId, week])

  useEffect(() => {
    load()
  }, [load])

  const fail = (error) => setToast({ message: apiErrorMessage(error, t), severity: 'error', key: Date.now() })

  /** Llama a la API y reemplaza la lista con la respuesta; `optimistic` se aplica antes. */
  const run = async (call, optimistic) => {
    const previous = list
    if (optimistic) setList(optimistic(list))
    setBusy(true)
    try {
      setList(await call())
      return true
    } catch (error) {
      setList(previous)
      fail(error)
      return false
    } finally {
      setBusy(false)
    }
  }

  const sortedFoods = useMemo(() => sortFoods(foods, language), [foods, language])

  const groups = useMemo(() => {
    if (!list) return []
    const collator = new Intl.Collator(language, { sensitivity: 'base' })
    const byCategory = new Map()
    for (const ingredient of list.ingredients) {
      const food = foodsById.get(ingredient.foodId)
      if (!food) continue
      const rows = byCategory.get(food.category) ?? []
      rows.push({ ...ingredient, name: foodName(food, language) })
      byCategory.set(food.category, rows)
    }
    return FOOD_CATEGORIES.filter((category) => byCategory.has(category)).map((category) => ({
      category,
      // Lo comprado va al final de cada grupo.
      rows: byCategory.get(category).sort((a, b) => a.checked - b.checked || collator.compare(a.name, b.name)),
    }))
  }, [list, foodsById, language])

  if (status === 'error') {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>{t('common.retry')}</Button>}>
        {apiErrorMessage(loadError, t)}
      </Alert>
    )
  }
  // Sin el catálogo de alimentos (lo carga la dieta) no hay nombres ni categorías que mostrar.
  if (!list || (foods.length === 0 && dietStatus !== 'error')) {
    return (
      <Stack spacing={2}>
        <Skeleton width={260} height={48} />
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: '20px' }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: '20px' }} />
      </Stack>
    )
  }

  const total = list.ingredients.length + list.items.length
  const bought = list.ingredients.filter((item) => item.checked).length + list.items.filter((item) => item.checked).length
  const allWeek = list.days.length === 0

  const setPeople = (people) => run(() => updateShopping(profileId, week, { people }), (current) => ({ ...current, people }))
  const setDays = (days) => run(() => updateShopping(profileId, week, { days }), (current) => ({ ...current, days }))

  const toggleIngredient = (key, checked) =>
    run(
      () => checkIngredient(profileId, week, key, checked),
      (current) => ({ ...current, ingredients: current.ingredients.map((item) => (item.key === key ? { ...item, checked } : item)) }),
    )
  const toggleItem = (itemId, checked) =>
    run(
      () => updateShoppingItem(profileId, itemId, { checked }),
      (current) => ({ ...current, items: current.items.map((item) => (item.id === itemId ? { ...item, checked } : item)) }),
    )
  const removeItem = (itemId) =>
    run(
      () => deleteShoppingItem(profileId, itemId),
      (current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }),
    )

  const addItem = async (event) => {
    event.preventDefault()
    const text = newItem.input.trim()
    // Si el texto coincide con un alimento del catálogo, se guarda como ese alimento.
    const food =
      (newItem.value && typeof newItem.value === 'object' ? newItem.value : null) ??
      sortedFoods.find((item) => normalizeText(foodName(item, language)) === normalizeText(text))
    if (!food && !text) return
    const body = food ? { foodId: food.id } : { name: text }
    const ok = await run(() => addShoppingItem(profileId, week, { ...body, amount: newItem.amount.trim() || null }))
    if (ok) setNewItem({ value: null, input: '', amount: '' })
  }

  const itemName = (item) => (item.foodId ? foodName(foodsById.get(item.foodId) ?? { nameEs: '—', nameEn: '—' }, language) : item.name)

  return (
    <>
      <Button component={RouterLink} to="/menu" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 2 }}>
        {t('common.backToMenu')}
      </Button>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, mb: 3 }}
      >
        <Box>
          <Typography variant="overline" color="secondary" component="p">
            {t('shopping.eyebrow', { label })}
          </Typography>
          <Typography variant="h4" component="h1">
            {t('shopping.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('diet.weekRange', {
              start: formatDay(week, language, { day: 'numeric', month: 'long' }),
              end: formatDay(addDaysIso(week, 6), language, { day: 'numeric', month: 'long' }),
            })}
          </Typography>
        </Box>
        {bought > 0 && (
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={() => run(() => updateShopping(profileId, week, { uncheckAll: true }))}
            disabled={busy}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
          >
            {t('shopping.uncheckAll')}
          </Button>
        )}
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, display: 'grid', gap: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1 }}>
              <GroupIcon color="primary" />
              <Box>
                <Typography sx={{ fontWeight: 700 }} id="shopping-people-label">
                  {t('shopping.people')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('shopping.peopleHint')}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="group" aria-labelledby="shopping-people-label">
              <IconButton
                onClick={() => setPeople(list.people - 1)}
                disabled={busy || list.people <= PEOPLE_RANGE.min}
                aria-label={t('shopping.peopleLess')}
                sx={{ border: 1, borderColor: 'divider' }}
              >
                <RemoveIcon />
              </IconButton>
              <Typography variant="h5" component="output" aria-live="polite" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 800 }}>
                {list.people}
              </Typography>
              <IconButton
                onClick={() => setPeople(list.people + 1)}
                disabled={busy || list.people >= PEOPLE_RANGE.max}
                aria-label={t('shopping.peopleMore')}
                sx={{ border: 1, borderColor: 'divider' }}
              >
                <AddIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }} id="shopping-days-label">
              {t('shopping.daysTitle')}
            </Typography>
            <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }} role="group" aria-labelledby="shopping-days-label">
              <Chip
                label={t('shopping.allWeek')}
                color={allWeek ? 'primary' : 'default'}
                variant={allWeek ? 'filled' : 'outlined'}
                onClick={() => !allWeek && setDays([])}
                aria-pressed={allWeek}
                disabled={busy}
              />
              {Array.from({ length: 7 }, (_, index) => {
                const date = addDaysIso(week, index)
                const active = list.days.includes(index)
                const dayLabel = `${capitalizeFirst(formatDay(date, language, { weekday: 'short' }))} ${formatDay(date, language, { day: 'numeric' })}`
                return (
                  <Chip
                    key={date}
                    label={date === today ? `${dayLabel} · ${t('summaryBar.today')}` : dayLabel}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    onClick={() => setDays(toggleDay(list.days, index))}
                    aria-pressed={active}
                    disabled={busy}
                  />
                )
              })}
            </Stack>
          </Box>

          {total > 0 && (
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t('shopping.progress', { bought, total })}
                </Typography>
                {bought === total && (
                  <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
                    {t('shopping.done')}
                  </Typography>
                )}
              </Stack>
              <LinearProgress
                variant="determinate"
                color="secondary"
                value={(bought / total) * 100}
                aria-label={t('shopping.progress', { bought, total })}
                sx={{ height: 8, borderRadius: '8px' }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {!list.hasDiet ? (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button component={RouterLink} to="/diet" color="inherit" size="small">
              {t('shopping.goToDiet')}
            </Button>
          }
        >
          {t('shopping.noDiet')}
        </Alert>
      ) : (
        groups.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('shopping.noIngredients')}
          </Alert>
        )
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start', mb: 3 }}>
        {groups.map(({ category, rows }) => (
          <Card key={category}>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="overline" color="text.secondary" component="h2" sx={{ fontWeight: 800 }}>
                {t(`foods.categories.${category}`)}
              </Typography>
              {rows.map((row) => (
                <ShoppingRow
                  key={row.key}
                  id={`shopping-${row.key}`}
                  checked={row.checked}
                  title={row.name}
                  amount={formatShoppingQuantity(row, t, language)}
                  detail={t('shopping.inMeals', { count: row.meals })}
                  onToggle={(checked) => toggleIngredient(row.key, checked)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="overline" color="text.secondary" component="h2" sx={{ fontWeight: 800 }}>
            {t('shopping.extrasTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('shopping.extrasHint')}
          </Typography>

          <Stack component="form" onSubmit={addItem} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }}>
            <Autocomplete
              freeSolo
              options={sortedFoods}
              groupBy={(food) => t(`foods.categories.${food.category}`)}
              getOptionLabel={(option) => (typeof option === 'string' ? option : foodName(option, language))}
              filterOptions={(options, { inputValue }) => {
                const text = normalizeText(inputValue.trim())
                return text ? options.filter((food) => normalizeText(foodName(food, language)).includes(text)).slice(0, 50) : options.slice(0, 50)
              }}
              value={newItem.value}
              onChange={(_event, value) => setNewItem((current) => ({ ...current, value }))}
              inputValue={newItem.input}
              onInputChange={(_event, input) => setNewItem((current) => ({ ...current, input }))}
              sx={{ flex: 2 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={t('shopping.itemLabel')}
                  placeholder={t('shopping.itemPlaceholder')}
                  slotProps={{ ...params.slotProps, htmlInput: { ...params.inputProps, maxLength: MAX_ITEM_TEXT } }}
                />
              )}
            />
            <TextField
              size="small"
              label={t('shopping.amountLabel')}
              placeholder={t('shopping.amountPlaceholder')}
              value={newItem.amount}
              onChange={(event) => setNewItem((current) => ({ ...current, amount: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: MAX_ITEM_TEXT } }}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={busy || !newItem.input.trim()}>
              {t('shopping.add')}
            </Button>
          </Stack>

          {list.items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {t('shopping.noExtras')}
            </Typography>
          ) : (
            [...list.items]
              .sort((a, b) => a.checked - b.checked)
              .map((item) => (
                <ShoppingRow
                  key={item.id}
                  id={`shopping-item-${item.id}`}
                  checked={item.checked}
                  title={itemName(item)}
                  amount={item.amount}
                  onToggle={(checked) => toggleItem(item.id, checked)}
                  action={
                    <IconButton onClick={() => removeItem(item.id)} disabled={busy} aria-label={t('shopping.remove', { name: itemName(item) })}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  }
                />
              ))
          )}
        </CardContent>
      </Card>

      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={(_event, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  )
}

export default function ShoppingPage() {
  const { t } = useTranslation()
  return <SelectedProfileGate>{({ index }) => <ShoppingContent label={profileLabel(t, index)} />}</SelectedProfileGate>
}
