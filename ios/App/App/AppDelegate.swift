import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        return (window?.rootViewController as? GameViewController)?.gameOrientations ?? .portrait
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// The same GameOrientation bridge used on Android: portrait menus, landscape board.
class GameViewController: CAPBridgeViewController {
    var gameOrientations: UIInterfaceOrientationMask = .portrait
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { gameOrientations }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .portrait }
    override var shouldAutorotate: Bool { true }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameOrientationPlugin())
    }
}

@objc(GameOrientationPlugin)
class GameOrientationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameOrientationPlugin"
    public let jsName = "GameOrientation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    @objc func set(_ call: CAPPluginCall) {
        guard let mode = call.getString("mode"), ["portrait", "landscape"].contains(mode) else {
            call.reject("Orientamento non valido")
            return
        }
        DispatchQueue.main.async {
            guard let controller = self.bridge?.viewController as? GameViewController else {
                call.reject("Plancia iPhone non disponibile")
                return
            }
            let mask: UIInterfaceOrientationMask = mode == "portrait" ? .portrait : .landscape
            controller.gameOrientations = mask
            if #available(iOS 16.0, *) {
                controller.setNeedsUpdateOfSupportedInterfaceOrientations()
                controller.view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: mask))
            } else {
                let orientation: UIInterfaceOrientation = mode == "portrait" ? .portrait : .landscapeRight
                UIDevice.current.setValue(orientation.rawValue, forKey: "orientation")
                UIViewController.attemptRotationToDeviceOrientation()
            }
            call.resolve()
        }
    }
}
