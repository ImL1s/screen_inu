cask "screen-inu" do
  version "0.2.3"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"

  url "https://github.com/ImL1s/screen_inu/releases/download/v#{version}/Screen.Inu_#{version}_aarch64.dmg"
  name "Screen Inu"
  desc "Modern screenshot OCR tool"
  homepage "https://github.com/ImL1s/screen_inu"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :high_sierra"

  app "Screen Inu.app"

  zap trash: [
    "~/Library/Application Support/com.iml1s.screeninu",
    "~/Library/Caches/com.iml1s.screeninu",
    "~/Library/Preferences/com.iml1s.screeninu.plist",
    "~/Library/Saved Application State/com.iml1s.screeninu.savedState",
  ]
end
