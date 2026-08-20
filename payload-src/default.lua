if not game:IsLoaded() then
	game.Loaded:Wait()
end

--------------------------------------------------------------------
-- Adonis bypass
--------------------------------------------------------------------
local DEBUG_AC = false
local Detected, Kill

if setthreadidentity then
	setthreadidentity(2)
end

if getgc and hookfunction then
	for _, v in getgc(true) do
		if typeof(v) == "table" then
			local DetectFunc = rawget(v, "Detected")
			local KillFunc = rawget(v, "Kill")

			if typeof(DetectFunc) == "function" and not Detected then
				Detected = DetectFunc
				hookfunction(Detected, function(Action, Info, NoCrash)
					if Action ~= "_" and DEBUG_AC then
						warn("Adonis flagged", Action, Info)
					end
					return true
				end)
			end

			if rawget(v, "Variables") and rawget(v, "Process") and typeof(KillFunc) == "function" and not Kill then
				Kill = KillFunc
				hookfunction(Kill, function(Info)
					if DEBUG_AC then
						warn("Adonis kill blocked", Info)
					end
				end)
			end
		end
	end

	if getrenv and newcclosure then
		local oldInfo
		oldInfo = hookfunction(getrenv().debug.info, newcclosure(function(...)
			local LevelOrFunc = ...
			if Detected and LevelOrFunc == Detected then
				return coroutine.yield(coroutine.running())
			end
			return oldInfo(...)
		end))
	end
end

if setthreadidentity then
	setthreadidentity(7)
end

--------------------------------------------------------------------
-- Config
--------------------------------------------------------------------
local Config = {
	Hitbox = "Head",
	MaxDistance = 1e9,
	InfRange = 1e9,
	SpoofDist = 10,
	TargetLineColor = Color3.fromRGB(160, 40, 255),
	WalkSpeed = 1000,
	WalkSpeedOn = false,
	EspColor = Color3.fromRGB(160, 160, 160),
	EspLockedColor = Color3.fromRGB(160, 40, 255),
	EspOutlineColor = Color3.fromRGB(0, 0, 0),
}

local Keybinds = {
	Lock = Enum.KeyCode.C,
	WalkSpeed = Enum.KeyCode.Z,
}

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local LocalPlayer = Players.LocalPlayer or Players.PlayerAdded:Wait()
local GunHandler = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("GunHandler"))
local MainGameEvent = ReplicatedStorage:WaitForChild("GameRemotes"):WaitForChild("MainGameEvent")

local oldGetAim = GunHandler.GetAim
local oldShoot = GunHandler.Shoot
local lockedPlayer = nil
local defaultWalkSpeed = 16

local function getCharacter()
	return LocalPlayer.Character
end

local function getHumanoid()
	local char = getCharacter()
	return char and char:FindFirstChildOfClass("Humanoid")
end

local function getHitPart(character)
	if not character then
		return nil
	end
	return character:FindFirstChild(Config.Hitbox)
		or character:FindFirstChild("Head")
		or character:FindFirstChild("HumanoidRootPart")
end

local function isAlive(player)
	local character = player and player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	return humanoid ~= nil and humanoid.Health > 0
end

local function getLockedTarget()
	if not lockedPlayer or not isAlive(lockedPlayer) then
		if lockedPlayer and not isAlive(lockedPlayer) then
			lockedPlayer = nil
		end
		return nil
	end
	local part = getHitPart(lockedPlayer.Character)
	if not part then
		return nil
	end
	return {
		Player = lockedPlayer,
		Part = part,
		Position = part.Position,
	}
end

local function isPlayerPart(part)
	for _, player in Players:GetPlayers() do
		local character = player.Character
		if character and part:IsDescendantOf(character) then
			return true
		end
	end
	return false
end

-- Wallbang: disable MAP queries once (not every shot)
do
	local map = Workspace:FindFirstChild("MAP")
	if map then
		for _, desc in map:GetDescendants() do
			if desc:IsA("BasePart") and not isPlayerPart(desc) then
				desc.CanQuery = false
			end
		end
		map.DescendantAdded:Connect(function(desc)
			if desc:IsA("BasePart") and not isPlayerPart(desc) then
				desc.CanQuery = false
			end
		end)
	end
end

local function applyWalkSpeed()
	local humanoid = getHumanoid()
	if not humanoid then
		return
	end
	humanoid.WalkSpeed = Config.WalkSpeedOn and Config.WalkSpeed or defaultWalkSpeed
end

local function getClosestToMouse()
	local camera = Workspace.CurrentCamera
	if not camera then
		return nil
	end

	local mousePos = UserInputService:GetMouseLocation()
	local best, bestScreen = nil, math.huge
	local camPos = camera.CFrame.Position

	for _, player in Players:GetPlayers() do
		if player ~= LocalPlayer and isAlive(player) then
			local part = getHitPart(player.Character)
			if part then
				local worldDist = (part.Position - camPos).Magnitude
				if worldDist <= Config.MaxDistance then
					local screen, onScreen = camera:WorldToViewportPoint(part.Position)
					if onScreen and screen.Z > 0 then
						local dx = screen.X - mousePos.X
						local dy = screen.Y - mousePos.Y
						local screenDist = dx * dx + dy * dy
						if screenDist < bestScreen then
							bestScreen = screenDist
							best = player
						end
					end
				end
			end
		end
	end

	return best
end

local function getAimOrigin()
	local camera = Workspace.CurrentCamera
	local char = getCharacter()
	local tool = char and char:FindFirstChildOfClass("Tool")
	local handle = tool and tool:FindFirstChild("Handle")
	if handle then
		local default = tool:FindFirstChild("Default")
		local mesh = default and default:FindFirstChild("Mesh")
		local muzzle = mesh and mesh:FindFirstChild("Muzzle")
		if muzzle then
			local wp = muzzle.WorldPosition
			if typeof(wp) == "Vector3" then
				return wp
			end
		end
		return handle.Position
	end
	return camera and camera.CFrame.Position or nil
end

--------------------------------------------------------------------
-- Silent aim ONLY through GetAim / AimPosition
-- Do NOT fake Shoot returns, do NOT rewrite Range on the tool
--------------------------------------------------------------------
function GunHandler.GetAim(origin)
	local target = getLockedTarget()
	if target and typeof(origin) == "Vector3" then
		local delta = target.Position - origin
		if delta.Magnitude > 1e-4 then
			return delta.Unit
		end
	end
	return oldGetAim(origin)
end

function GunHandler.Shoot(data)
	local target = getLockedTarget()
	if target then
		local origin = data.ForcedOrigin
		if typeof(origin) ~= "Vector3" and data.Handle then
			origin = data.Handle.Position
		end
		if typeof(origin) == "Vector3" then
			local delta = target.Position - origin
			if delta.Magnitude > 1e-4 then
				local range = typeof(data.Range) == "number" and data.Range or 500
				data.AimPosition = origin + delta.Unit * range
			end
		end
	end
	-- pass through real raycast results (needed for ammo + damage)
	return oldShoot(data)
end

--------------------------------------------------------------------
-- FireServer hook (safer than __namecall)
-- Only spoofs distance when LOCKED. Never drops nil args.
--------------------------------------------------------------------
if hookfunction and typeof(MainGameEvent.FireServer) == "function" then
	local oldFire
	oldFire = hookfunction(MainGameEvent.FireServer, newcclosure(function(self, ...)
		local argc = select("#", ...)
		local args = { ... }

		if args[1] == "CHECKER_4" then
			return nil
		end

		if args[1] == "ShootGun" then
			local target = getLockedTarget()
			if target then
				local hitPos = target.Position
				local origin = args[3]

				-- Layout A: Origin, ResultsTable, nil, nil, nil, Range, Damage
				if typeof(args[4]) == "table" and typeof(args[8]) == "number" then
					if typeof(origin) == "Vector3" then
						local delta = origin - hitPos
						if delta.Magnitude > 1e-4 then
							args[3] = hitPos + delta.Unit * Config.SpoofDist
						else
							args[3] = hitPos + Vector3.new(0, 0, Config.SpoofDist)
						end
					end
					-- keep real Results from GunHandler — only shorten reported range
					args[8] = Config.SpoofDist
					-- DO NOT touch args[9] damage
					return oldFire(self, table.unpack(args, 1, argc))
				end

				-- Layout B: Origin, HitInstance, HitPoint, Distance, ...
				if typeof(args[5]) == "Vector3" and typeof(args[6]) == "number" then
					local delta = (typeof(origin) == "Vector3" and (origin - args[5])) or Vector3.new(0, 0, 1)
					if delta.Magnitude > 1e-4 then
						args[3] = args[5] + delta.Unit * Config.SpoofDist
					end
					args[6] = Config.SpoofDist
					return oldFire(self, table.unpack(args, 1, argc))
				end
			end
		end

		return oldFire(self, ...)
	end))
	print("[SA] FireServer hook ready")
else
	warn("[SA] could not hook FireServer")
end

--------------------------------------------------------------------
-- Visuals
--------------------------------------------------------------------
local lineFolder = Instance.new("Folder")
lineFolder.Name = "SilentAimTargetLine"
lineFolder.Parent = Workspace

local a0 = Instance.new("Attachment")
local a1 = Instance.new("Attachment")
a0.Parent = Workspace.Terrain
a1.Parent = Workspace.Terrain

local beam = Instance.new("Beam")
beam.Attachment0 = a0
beam.Attachment1 = a1
beam.FaceCamera = true
beam.LightEmission = 1
beam.Segments = 1
beam.Width0 = 0.1
beam.Width1 = 0.1
beam.Color = ColorSequence.new(Config.TargetLineColor)
beam.Transparency = NumberSequence.new(1)
beam.Parent = lineFolder

local lineVisible = false
local function hideLine()
	if lineVisible then
		beam.Transparency = NumberSequence.new(1)
		lineVisible = false
	end
end

local function showLine(fromPos, toPos)
	a0.WorldPosition = fromPos
	a1.WorldPosition = toPos
	beam.Color = ColorSequence.new(Config.TargetLineColor)
	if not lineVisible then
		beam.Transparency = NumberSequence.new(0)
		lineVisible = true
	end
end

local espFolder = Instance.new("Folder")
espFolder.Name = "NameESP"
espFolder.Parent = Workspace
local espEntries = {}

local function destroyEsp(player)
	local entry = espEntries[player]
	if entry then
		entry.Billboard:Destroy()
		espEntries[player] = nil
	end
end

local function createEsp(player)
	if player == LocalPlayer or espEntries[player] then
		return
	end
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "NameESP"
	billboard.Size = UDim2.new(0, 200, 0, 40)
	billboard.StudsOffset = Vector3.new(0, -2.8, 0)
	billboard.AlwaysOnTop = true
	billboard.MaxDistance = Config.MaxDistance
	billboard.Parent = espFolder

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.new(1, 0, 1, 0)
	label.Font = Enum.Font.GothamBold
	label.TextSize = 14
	label.Text = player.DisplayName
	label.TextColor3 = Config.EspColor
	label.TextStrokeColor3 = Config.EspOutlineColor
	label.TextStrokeTransparency = 0
	label.Parent = billboard

	espEntries[player] = { Billboard = billboard, Label = label, Adornee = nil }
end

local function updateEsp()
	for _, player in Players:GetPlayers() do
		if player ~= LocalPlayer then
			createEsp(player)
			local entry = espEntries[player]
			local character = player.Character
			local root = character and (character:FindFirstChild("HumanoidRootPart") or character:FindFirstChild("Head"))
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if entry then
				entry.Label.Text = player.DisplayName
				entry.Label.TextColor3 = (player == lockedPlayer) and Config.EspLockedColor or Config.EspColor
				entry.Label.TextStrokeTransparency = 0
				if root and humanoid and humanoid.Health > 0 then
					if entry.Adornee ~= root then
						entry.Billboard.Adornee = root
						entry.Adornee = root
					end
					entry.Billboard.Enabled = true
				else
					entry.Billboard.Enabled = false
					entry.Adornee = nil
				end
			end
		end
	end
end

for _, player in Players:GetPlayers() do
	createEsp(player)
end
Players.PlayerAdded:Connect(createEsp)
Players.PlayerRemoving:Connect(function(player)
	if lockedPlayer == player then
		lockedPlayer = nil
	end
	destroyEsp(player)
end)

local function onCharacter(char)
	local humanoid = char:WaitForChild("Humanoid", 5)
	if humanoid then
		defaultWalkSpeed = humanoid.WalkSpeed
		if defaultWalkSpeed >= Config.WalkSpeed then
			defaultWalkSpeed = 16
		end
		applyWalkSpeed()
	end
end

if LocalPlayer.Character then
	task.spawn(onCharacter, LocalPlayer.Character)
end
LocalPlayer.CharacterAdded:Connect(onCharacter)

local accum = 0
RunService.Heartbeat:Connect(function(dt)
	if Config.WalkSpeedOn then
		applyWalkSpeed()
	end

	accum += dt
	if accum < 0.03 then
		return
	end
	accum = 0

	updateEsp()

	local target = getLockedTarget()
	if not target then
		hideLine()
		return
	end
	local origin = getAimOrigin()
	if origin then
		showLine(origin, target.Position)
	else
		hideLine()
	end
end)

UserInputService.InputBegan:Connect(function(input, gp)
	if gp or input.UserInputType ~= Enum.UserInputType.Keyboard then
		return
	end

	if input.KeyCode == Keybinds.Lock then
		if lockedPlayer then
			lockedPlayer = nil
			hideLine()
			print("[SA] Unlocked")
		else
			local target = getClosestToMouse()
			if target then
				lockedPlayer = target
				print("[SA] Locked =", target.DisplayName)
			else
				print("[SA] No target near mouse")
			end
		end
		updateEsp()
	elseif input.KeyCode == Keybinds.WalkSpeed then
		Config.WalkSpeedOn = not Config.WalkSpeedOn
		applyWalkSpeed()
		print("[SA] WalkSpeed =", Config.WalkSpeedOn and Config.WalkSpeed or defaultWalkSpeed)
	end
end)

print("[SA] FIXED pass-through shoot | C=lock Z=speed")
print("[SA] Test WITHOUT lock first — ammo/damage should be normal")
