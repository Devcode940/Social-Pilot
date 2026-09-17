'use client'

import { useState, useEffect, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import {
  User,
  Link2,
  Bell,
  Palette,
  KeyRound,
  AlertTriangle,
  Loader2,
  Camera,
  Trash2,
  Download,

  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Facebook,
  ExternalLink,
  Shield,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Seoul', label: 'Seoul' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-sky-500' },
  { id: 'tiktok', name: 'TikTok', color: 'text-gray-900 dark:text-white', icon: () => (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.83 4.83 0 01-3.77-1.24V6.69h3.77z"/></svg>
  ) },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-700' },
]

interface UserData {
  id: string
  email: string
  name: string | null
  avatar: string | null
  bio: string | null
  timezone: string
}

interface SettingsData {
  emailNotifications: boolean
  pushNotifications: boolean
  postPublishedNotify: boolean
  commentAlerts: boolean
  campaignCompletion: boolean
  weeklyAnalyticsDigest: boolean
  trendAlerts: boolean
  theme: string
  compactMode: boolean
  sidebarDefaultExpanded: boolean
}

interface ApiKeyItem {
  id: string
  label: string
  keyPreview: string
  createdAt: string
}

interface ConnectedAccount {
  id: string
  platform: string
  username: string
  displayName: string | null
  followers: number
  following: number
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [, setSettings] = useState<SettingsData | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])

  // Profile form state
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileTimezone, setProfileTimezone] = useState('UTC')
  const [profileSaving, setProfileSaving] = useState(false)

  // Notification form state
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSettings, setNotifSettings] = useState<SettingsData | null>(null)

  // Appearance form state
  const [appearanceSaving, setAppearanceSaving] = useState(false)
  const [appearanceSettings, setAppearanceSettings] = useState<SettingsData | null>(null)

  // API key form state
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [apiKeySaving, setApiKeySaving] = useState(false)

  // Connect dialog state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  // Danger zone state
  const [dangerLoading, setDangerLoading] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, accountsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/accounts'),
      ])
      const settingsData = await settingsRes.json()
      const accountsData = await accountsRes.json()

      setUser(settingsData.user)
      setSettings(settingsData.settings)
      setApiKeys(settingsData.apiKeys || [])
      setConnectedAccounts(accountsData || [])

      setProfileName(settingsData.user.name || '')
      setProfileBio(settingsData.user.bio || '')
      setProfileTimezone(settingsData.user.timezone || 'UTC')
      setNotifSettings(settingsData.settings)
      setAppearanceSettings(settingsData.settings)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'profile', name: profileName, bio: profileBio, timezone: profileTimezone }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUser(data.user)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const saveNotifications = async () => {
    if (!notifSettings) return
    setNotifSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'notifications', ...notifSettings }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSettings(data.settings)
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save notification preferences')
    } finally {
      setNotifSaving(false)
    }
  }

  const saveAppearance = async () => {
    if (!appearanceSettings) return
    setAppearanceSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'appearance', ...appearanceSettings }),
      })
      if (!res.ok) throw new Error()
      toast.success('Appearance settings saved')
    } catch {
      toast.error('Failed to save appearance settings')
    } finally {
      setAppearanceSaving(false)
    }
  }

  const addApiKey = async () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      toast.error('Please provide both label and key')
      return
    }
    setApiKeySaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'apiKey', label: newKeyLabel, key: newKeyValue }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setApiKeys((prev) => [data.apiKey, ...prev])
      setNewKeyLabel('')
      setNewKeyValue('')
      toast.success('API key saved — only a preview is shown afterwards')
    } catch {
      toast.error('Failed to add API key')
    } finally {
      setApiKeySaving(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'deleteApiKey', id }),
      })
      if (!res.ok) throw new Error()
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('API key deleted')
    } catch {
      toast.error('Failed to delete API key')
    }
  }



  const handleExportData = async () => {
    setDangerLoading('export')
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'socialpilot-export.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch {
      toast.error('Failed to export data')
    } finally {
      setDangerLoading(null)
    }
  }

  const handleClearData = async () => {
    setDangerLoading('clear')
    try {
      const res = await fetch('/api/settings?action=clearData', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('All data cleared')
      fetchSettings()
    } catch {
      toast.error('Failed to clear data')
    } finally {
      setDangerLoading(null)
    }
  }

  const handleDeleteAccount = async () => {
    setDangerLoading('delete')
    try {
      const res = await fetch('/api/settings?action=deleteAccount', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Account deleted')
      await signOut({ callbackUrl: '/auth/login' })
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setDangerLoading(null)
    }
  }

  const disconnectAccount = async (id: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      setConnectedAccounts((prev) => prev.filter((a) => a.id !== id))
      toast.success('Account disconnected')
    } catch {
      toast.error('Failed to disconnect account')
    }
  }

  const getConnectedAccount = (platformId: string) => connectedAccounts.find((a) => a.platform === platformId)

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="grid gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, preferences, and integrations.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
            <User className="size-4 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5 text-xs sm:text-sm">
            <Link2 className="size-4 hidden sm:block" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
            <Bell className="size-4 hidden sm:block" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
            <Palette className="size-4 hidden sm:block" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="gap-1.5 text-xs sm:text-sm">
            <KeyRound className="size-4 hidden sm:block" />
            API
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="size-4 hidden sm:block" />
            Danger
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and public profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="size-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                      {user ? getInitials(user.name || 'U') : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => toast.info('Avatar upload coming soon')}
                  >
                    <Camera className="size-5 text-white" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">Click the avatar to change your profile photo</p>
                </div>
              </div>

              <Separator />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your display name"
                  className="max-w-md"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="max-w-md bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="max-w-lg min-h-[100px] resize-y"
                />
                <p className="text-xs text-muted-foreground">{profileBio.length}/500 characters</p>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={profileTimezone} onValueChange={setProfileTimezone}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connected Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Manage your connected social media platforms.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PLATFORMS.map((platform) => {
                  const connected = getConnectedAccount(platform.id)
                  const IconComponent = platform.icon

                  return (
                    <div key={platform.id}>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className={`flex size-10 items-center justify-center rounded-lg bg-muted ${platform.color}`}>
                            {typeof IconComponent === 'function' ? <IconComponent className="size-5" /> : null}
                          </div>
                          <div>
                            <p className="font-medium">{platform.name}</p>
                            {connected ? (
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>@{connected.username}</span>
                                <span>·</span>
                                <span>{connected.followers.toLocaleString()} followers</span>
                                <span>·</span>
                                <span>{connected.following} following</span>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Not connected</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={connected ? 'default' : 'secondary'}>
                            {connected ? 'Connected' : 'Not Connected'}
                          </Badge>
                          {connected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => disconnectAccount(connected.id)}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setConnectingPlatform(platform.id)
                                setConnectDialogOpen(true)
                              }}
                            >
                              <ExternalLink className="mr-1.5 size-3.5" />
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Connect Dialog */}
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Connect {connectingPlatform ? PLATFORMS.find((p) => p.id === connectingPlatform)?.name : ''} Account
                </DialogTitle>
                <DialogDescription>
                  Connect your {connectingPlatform ? PLATFORMS.find((p) => p.id === connectingPlatform)?.name : ''} account via OAuth to enable posting, analytics, and engagement features.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 size-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Secure OAuth Connection</p>
                      <p className="text-xs text-muted-foreground">
                        SocialPilot will request read and write permissions for your social media account. 
                        Your credentials are never stored on our servers.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>With this connection you can:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>Schedule and publish posts automatically</li>
                    <li>View analytics and engagement metrics</li>
                    <li>Monitor and respond to comments</li>
                    <li>Track follower growth and engagement trends</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setConnectDialogOpen(false)
                    toast.info(`OAuth flow for ${connectingPlatform} would start here in production`)
                  }}
                >
                  Authorize Connection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notifSettings && (
                <div className="space-y-6">
                  {/* General */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">General</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notifSettings.emailNotifications}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, emailNotifications: v }) : s)}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive push notifications in your browser</p>
                      </div>
                      <Switch
                        checked={notifSettings.pushNotifications}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, pushNotifications: v }) : s)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Activity */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Activity Alerts</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Post Published</Label>
                        <p className="text-xs text-muted-foreground">Notify when a post is published successfully</p>
                      </div>
                      <Switch
                        checked={notifSettings.postPublishedNotify}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, postPublishedNotify: v }) : s)}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Comment Alerts</Label>
                        <p className="text-xs text-muted-foreground">Notify when someone comments on your posts</p>
                      </div>
                      <Switch
                        checked={notifSettings.commentAlerts}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, commentAlerts: v }) : s)}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Campaign Completion</Label>
                        <p className="text-xs text-muted-foreground">Notify when campaigns reach their targets</p>
                      </div>
                      <Switch
                        checked={notifSettings.campaignCompletion}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, campaignCompletion: v }) : s)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Digests */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Reports & Digests</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Analytics Digest</Label>
                        <p className="text-xs text-muted-foreground">Receive a weekly summary of your analytics</p>
                      </div>
                      <Switch
                        checked={notifSettings.weeklyAnalyticsDigest}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, weeklyAnalyticsDigest: v }) : s)}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Trend Alerts</Label>
                        <p className="text-xs text-muted-foreground">Get notified about trending topics in your niche</p>
                      </div>
                      <Switch
                        checked={notifSettings.trendAlerts}
                        onCheckedChange={(v) => setNotifSettings((s) => s ? ({ ...s, trendAlerts: v }) : s)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button onClick={saveNotifications} disabled={notifSaving}>
                  {notifSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how SocialPilot looks and feels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {appearanceSettings && (
                <>
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <RadioGroup
                      value={appearanceSettings.theme}
                      onValueChange={(v) => setAppearanceSettings((s) => s ? ({ ...s, theme: v }) : s)}
                      className="flex flex-wrap gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="cursor-pointer">Light</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system" className="cursor-pointer">System</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact Mode</Label>
                      <p className="text-xs text-muted-foreground">Reduce spacing and padding for a denser UI</p>
                    </div>
                    <Switch
                      checked={appearanceSettings.compactMode}
                      onCheckedChange={(v) => setAppearanceSettings((s) => s ? ({ ...s, compactMode: v }) : s)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sidebar Default State</Label>
                      <p className="text-xs text-muted-foreground">Choose whether the sidebar starts expanded or collapsed</p>
                    </div>
                    <Switch
                      checked={appearanceSettings.sidebarDefaultExpanded}
                      onCheckedChange={(v) => setAppearanceSettings((s) => s ? ({ ...s, sidebarDefaultExpanded: v }) : s)}
                    />
                  </div>
                </>
              )}

              <div className="pt-4">
                <Button onClick={saveAppearance} disabled={appearanceSaving}>
                  {appearanceSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Appearance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apikeys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for external integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add new key */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Add New API Key</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Label (e.g., Production)"
                    className="sm:max-w-[200px]"
                  />
                  <Input
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder="API Key value"
                    className="flex-1"
                  />
                  <Button onClick={addApiKey} disabled={apiKeySaving}>
                    {apiKeySaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Add Key
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Key list */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Your API Keys</h3>
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No API keys configured yet.</p>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((apiKey) => {
                      return (
                        <div key={apiKey.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-sm font-medium">{apiKey.label}</p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-[300px]">
                                {apiKey.keyPreview}
                              </code>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive shrink-0 ml-2"
                            onClick={() => deleteApiKey(apiKey.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible and destructive actions. Proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Data */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Export All Data</p>
                  <p className="text-xs text-muted-foreground">Download all your data as a JSON file</p>
                </div>
                <Button variant="outline" onClick={handleExportData} disabled={dangerLoading === 'export'}>
                  {dangerLoading === 'export' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
                  Export Data
                </Button>
              </div>

              {/* Clear Data */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Clear All Data</p>
                      <p className="text-xs text-muted-foreground">Delete all your posts, comments, campaigns, and notifications</p>
                    </div>
                    <Button variant="outline" disabled={dangerLoading === 'clear'}>
                      {dangerLoading === 'clear' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                      Clear Data
                    </Button>
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your posts, comments, campaigns, and notifications. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, clear all data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Delete Account */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4 cursor-pointer hover:bg-destructive/5 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-destructive">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
                    </div>
                    <Button variant="destructive" disabled={dangerLoading === 'delete'}>
                      {dangerLoading === 'delete' ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Delete Account
                    </Button>
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account, all connected social accounts, and all associated data. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
