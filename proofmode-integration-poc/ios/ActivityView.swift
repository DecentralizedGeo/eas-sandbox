//
//  ActivityView.swift
//  Proofmode
//
//  Created by N-Pex on 2023-02-24.
//

import SwiftUI
import Photos
import LibProofMode
import CoreData

private let assetsGutterSize = CGFloat(10)
private let assetsCornerRadius = CGFloat(20)
private let assetsBackground = Color.black.opacity(0.1)

class ThumbnailManager {
    let imageManager = PHCachingImageManager()
    
    var pendingRequests: [String: PHImageRequestID] = [:]
    
    func load(item: CameraItem, id: String, size: CGSize, loaded: @escaping (UIImage?) -> Void) {
        if let asset = item.asset {
            pendingRequests[id] = imageManager.requestImage(for: asset, targetSize: size, contentMode: .aspectFill, options: nil) { image, properties in
                self.pendingRequests.removeValue(forKey: id)
                if let image = image {
                    loaded(image)
                }
            }
        } else if let url = item.mediaUrl {
            if EnvironmentValues.gIsPreview {
                let names = ["img_home-on", "img_home-off", "ill_tut01", "ill_tut02", "ill_tut03", "ill_tut04"]
                let randomIndex = Int.random(in: 0..<names.count)
                loaded(UIImage(named: names[randomIndex]))
                return
            }
            let fileCoordinator = NSFileCoordinator()
            var error: NSError? = nil
            fileCoordinator.coordinate(readingItemAt: url, error: &error) { dataUrl in
                if let data = try? Data(contentsOf: dataUrl), let image = UIImage(data: data) {
                    loaded(image)
                } else {
                    loaded(nil)
                }
            }
        } else if let imageData = item.data, let image = UIImage(data: imageData) {
            loaded(image)
        }
    }
    
    func unload(item: CameraItem, id: String) -> Void {
        if let openRequest = pendingRequests[id] {
            imageManager.cancelImageRequest(openRequest)
            pendingRequests.removeValue(forKey: id)
        }
    }
}

enum CapturedAssetRow {
    case oneItem(asset: CameraItem)
    case twoItems(assets: [CameraItem])
    case threeItems(assets: [CameraItem])
    case fourItems(assets: [CameraItem])
}

public enum SelectionVisualization {
    case none, border, checkmark
}

/**
 Where to show a  "file type indicator". For "bottomRight" we show a small icon in the bottom right corner. For "none" no indicator is shown. Default "none".
 */
public enum FileTypeIndicator {
    case none, bottomRight
}

struct AssetViewScaleModifier: ViewModifier {
    @State var contain: Bool = false
    func body(content: Content) -> some View {
        if self.contain {
            content.scaledToFit()
        } else {
            content.scaledToFill()
        }
    }
}

struct AssetView: View {
    @Environment(\.onAssetTapped) var onAssetTapped: ((CameraItem) -> Void)?
    @Environment(\.onAssetLongTapped) var onAssetLongTapped: ((CameraItem) -> Void)?
    @Environment(\.selectedAssets) var selectedAssets: [CameraItem]
    @Environment(\.thumbnailManager) var thumbnailManager: ThumbnailManager
    
    var id = UUID().uuidString
    
    @ObservedObject var asset: CameraItem
    
    @State var thumbnail: UIImage? = nil
    @State var corners: UIRectCorner = .allCorners
    @State var cornerRadius: CGFloat = assetsCornerRadius
    @State var contain: Bool = false
    @State var selectionVisualization: SelectionVisualization = .border
    @State var fileTypeIndicator: FileTypeIndicator = .none
    
    func isSaving() -> Bool {
        switch asset.state {
        case .saving: return true
        default: return false
        }
    }
    
    var body: some View {
        let isSelected = selectedAssets.contains(where: { a in
            a.uniqueIdentifier == self.asset.uniqueIdentifier
        })
        GeometryReader { gr in
            ZStack(alignment: .center) {
                if let thumbnail = thumbnail {
                    Image(uiImage: thumbnail)
                        .resizable()
                        .modifier(AssetViewScaleModifier(contain: contain))
                        .if (selectionVisualization == .checkmark && isSelected) { view in
                            view.overlay(alignment: .bottomTrailing) {
                                Image("ic_selected_blue")
                                    .padding(8)
                            }
                        }
                        .position(x: gr.frame(in: .local).midX, y: gr.frame(in: .local).midY)
                        .frame(width: gr.size.width, height: gr.size.height)
                        .clipped()
                        .cornerRadius(cornerRadius, corners: self.corners)
                } else {
                    ZStack(alignment: .center) {
                        if !isSaving() {
                            ProgressView()
                        }
                    }
                    .frame(width: gr.size.width, height: gr.size.height)
                    .background(.gray)
                    .cornerRadius(cornerRadius, corners: self.corners)
                    .clipped()
                }
                
                switch fileTypeIndicator {
                case .none:
                    EmptyView()
                case .bottomRight:
                    if asset.asset?.mediaType == .video {
                        ZStack(alignment: .bottomTrailing) {
                            Color.clear
                            Image(systemName: "play.circle.fill")
                                .resizable()
                                .renderingMode(.template)
                                .foregroundColor(.white)
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 20, height: 20)
                        }
                        .padding(20)
                        .frame(width: gr.size.width, height: gr.size.height)
                    }
                }
                
                if asset.isGeneratingProof || isSaving() {
                    ZStack(alignment: .bottomTrailing) {
                        Color.clear
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 8))
                    }
                }
                //Text(asset.uniqueIdentifier).foregroundColor(.white).disabled(true)
            }
            .clipped()
            .contentShape(Path(CGRect(x: 0, y: 0, width: gr.size.width, height: gr.size.height))) // See https://stackoverflow.com/questions/69979219/swiftui-tap-gesture-selecting-wrong-item
            .onTapGesture {
                onAssetTapped?(asset)
            }
            .onLongPressGesture {
                onAssetLongTapped?(asset)
            }
            .overlay(alignment: .center) {
                RoundedCorner(radius: cornerRadius - 4, corners: self.corners)
                    .stroke(selectionVisualization == .border && isSelected ? .blue : .clear, lineWidth: 4)
                    .frame(width: max(0, gr.size.width - 4), height: max(0, gr.size.height - 4))
            }
            .onAppear {
                if thumbnail == nil, !isSaving() {
                    thumbnailManager.load(item: asset, id: id, size: gr.size) { image in
                        thumbnail = image
                    }
                }
            }
            .onDisappear {
                thumbnailManager.unload(item: asset, id: id)
                self.thumbnail = nil
            }
            .task(id: asset.data) {
                if thumbnail == nil {
                    thumbnailManager.load(item: asset, id: id, size: gr.size) { image in
                        thumbnail = image
                    }
                }
            }
            .onChange(of: isSaving()) { newValue in
                if thumbnail == nil, !newValue {
                    thumbnailManager.load(item: asset, id: id, size: gr.size) { image in
                        thumbnail = image
                    }
                }
            }
        }
    }
}


struct OneItemAssetRowView: View {
    @State var asset: CameraItem
    var proxy:GeometryProxy
    
    var body: some View {
        AssetView(asset: asset, fileTypeIndicator: .bottomRight)
            .frame(width: proxy.size.width, height: (9 * proxy.size.width) / 16)
    }
}

struct TwoItemsAssetRowView: View {
    let assets: [CameraItem]
    var proxy:GeometryProxy
    var columnWidth: CGFloat {
        get {
            return (proxy.size.width - assetsGutterSize) / 2
        }
    }
    var columnHeight: CGFloat {
        get {
            return columnWidth
        }
    }
    
    var body: some View {
        LazyHStack(spacing: assetsGutterSize) {
            AssetView(asset: assets[0], fileTypeIndicator: .bottomRight)
                .frame(width: columnWidth, height: columnHeight)
            
            AssetView(asset: assets[1], fileTypeIndicator: .bottomRight)
                .frame(width: columnWidth, height: columnHeight)
            
        }
        .frame(width: proxy.size.width, height: columnHeight)
    }
}

struct ThreeItemsAssetRowView: View {
    let assets: [CameraItem]
    
    var proxy:GeometryProxy
    var column1: CGFloat {
        get {
            return proxy.size.width - column2Width - assetsGutterSize
        }
    }
    var column2Width: CGFloat {
        get {
            return (proxy.size.width - 2 * assetsGutterSize) / 3
        }
    }
    var column2Height: CGFloat {
        get {
            return 2 * column2Width + assetsGutterSize
        }
    }
    
    var body: some View {
        LazyHStack(spacing: assetsGutterSize) {
            AssetView(asset: assets[0], fileTypeIndicator: .bottomRight)
                .frame(width: column1, height: column2Height)
            
            
            VStack() {
                AssetView(asset: assets[1], fileTypeIndicator: .bottomRight)
                    .frame(height: column2Width)
                
                AssetView(asset: assets[2], fileTypeIndicator: .bottomRight)
                    .frame(height: column2Width)
            }
            .frame(width: column2Width)
        }
        .frame(width: proxy.size.width, height: column2Height)
    }
}

struct FourItemsAssetRowView: View {
    @State var assets: [CameraItem]
    var proxy:GeometryProxy
    var columnWidth: CGFloat {
        get {
            return (proxy.size.width - 2 * assetsGutterSize) / 3
        }
    }
    var columnHeight: CGFloat {
        get {
            return columnWidth
        }
    }
    
    var body: some View {
        HStack(spacing: assetsGutterSize) {
            AssetView(asset: assets[0], fileTypeIndicator: .bottomRight)
                .frame(width: columnWidth, height: columnHeight)
            
            VStack() {
                AssetView(asset: assets[1], corners: [.topLeft, .topRight], fileTypeIndicator: .bottomRight)
                    .frame(height: (columnHeight - assetsGutterSize) / 2)
                
                AssetView(asset: assets[2], corners: [.bottomLeft, .bottomRight], fileTypeIndicator: .bottomRight)
                    .frame(height: (columnHeight - assetsGutterSize) / 2)
            }
            .frame(width: columnWidth, height: columnHeight)
            
            AssetView(asset: assets[3], fileTypeIndicator: .bottomRight)
                .frame(width: columnWidth, height: columnHeight)
        }
        .frame(width: proxy.size.width, height: columnHeight)
    }
}

struct MediaCapturedOrImportedActivityView: View {
    @State var proxy:GeometryProxy
    @State var items: [CameraItem]
    @State var capturedItems: Bool = true
    @State var layoutedRows: [CapturedAssetRow] = []
    
    var body: some View {
        VStack(spacing: 0) {
            Text(capturedItems ? "You captured \(items.count) items" : "You imported \(items.count) items")
                .font(.custom(Font.bodyFont, size: 15))
                .fontWeight(.regular)
                .foregroundColor(Color("colorDarkGray"))
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))
            
            if let deletedItemsString = items.deletedItemsString() {
                Text(deletedItemsString)
                    .font(.custom(Font.bodyFont, size: 12))
                    .fontWeight(.regular)
                    .foregroundColor(Color("colorDarkGray"))
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))
            }

            VStack(spacing: assetsGutterSize) {
                let rows = layoutedRows
                ForEach((0..<rows.count), id: \.self) { index in
                    switch rows[index] {
                    case .oneItem(let asset):
                        OneItemAssetRowView(asset: asset, proxy: proxy)
                    case .twoItems(let assets):
                        TwoItemsAssetRowView(assets: assets, proxy: proxy)
                    case .threeItems(let assets):
                        ThreeItemsAssetRowView(assets: assets, proxy: proxy)
                    case .fourItems(let assets):
                        FourItemsAssetRowView(assets: assets, proxy: proxy)
                    }
                }
            }
        }
        .task(id: items) {
            layoutedRows = layoutRows()
        }
        .onAppear {
            layoutedRows = layoutRows()
        }
    }
    
    func layoutRows() -> [CapturedAssetRow] {
        var array = Array(self.items).withDeletedItemsRemoved()
        var rows: [CapturedAssetRow] = []
        while (array.count > 0) {
            if array.count >= 7 {
                rows.append(.threeItems(assets: [] + array[0...2]))
                rows.append(.fourItems(assets: [] + array[3...6]))
                array = [] + array.dropFirst(7)
            } else if array.count >= 3 {
                rows.append(.threeItems(assets: [] + array[0...2]))
                array = [] + array.dropFirst(3)
            } else if array.count >= 2 {
                rows.append(.twoItems(assets: [] + array[0...1]))
                array = [] + array.dropFirst(2)
            } else {
                rows.append(.oneItem(asset: array[0]))
                array = [] + array.dropFirst(1)
            }
        }
        return rows
    }
}

struct MediaSharedActivityView: View {
    @State var proxy:GeometryProxy
    @State var items: [CameraItem]
    @State var fileName: String
    
    var body: some View {
        VStack(spacing: 0) {
            Text("You shared \(items.count) items")
                .font(.custom(Font.bodyFont, size: 15))
                .fontWeight(.regular)
                .foregroundColor(Color("colorDarkGray"))
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))
            
            if let deletedItemsString = items.deletedItemsString() {
                Text(deletedItemsString)
                    .font(.custom(Font.bodyFont, size: 12))
                    .fontWeight(.regular)
                    .foregroundColor(Color("colorDarkGray"))
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))
            }
            
            let itemSize = CGFloat(60)
            let gutterSize = CGFloat(8)
            let nColumns = floor(proxy.size.width / (itemSize + gutterSize))
            let columns = Array(repeating: GridItem(.fixed(itemSize)), count: Int(nColumns))
            LazyVGrid(columns: columns, spacing: gutterSize) {
                ForEach(items.withDeletedItemsRemoved()) { item in
                    AssetView(asset: item, cornerRadius: itemSize / 2)
                        .frame(width: itemSize, height: itemSize)
                }
            }.padding(EdgeInsets(top: 8, leading: 0, bottom: 0, trailing: 0))
//            Text("File: \(fileName)")
//                .font(.custom(Font.bodyFont, size: 12))
//                .fontWeight(.regular)
//                .foregroundColor(Color("colorDarkGray"))
//                .multilineTextAlignment(.leading)
//                .frame(maxWidth: .infinity, alignment: .leading)
//                .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))

        }
        .onDisappear {
        }
        
    }
}

struct PublicKeySharedActivityView: View {
    @State var proxy:GeometryProxy
    @State var publicKey: String
    
    var body: some View {
        VStack(spacing: 0) {
            Text("You shared your public key")
                .font(.custom(Font.bodyFont, size: 15))
                .fontWeight(.regular)
                .foregroundColor(Color("colorDarkGray"))
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))
        }
    }
}


struct ActivityView: View {
    let activity: Activity
    var proxy:GeometryProxy
    
    var body: some View {
        if let captured = activity.type as? ActivityTypeCaptured {
            return AnyView(MediaCapturedOrImportedActivityView(proxy: proxy, items: captured.items.reversed(), capturedItems: true))
        } else if let imported = activity.type as? ActivityTypeImported {
            return AnyView(MediaCapturedOrImportedActivityView(proxy: proxy, items: imported.items.reversed(), capturedItems: false))
        } else if let shared = activity.type as? ActivityTypeShared {
            return AnyView(MediaSharedActivityView(proxy: proxy, items: shared.items.reversed(), fileName: shared.fileName))
        } else if let publicKeyShared = activity.type as? ActivityTypePublicKeyShared {
            return AnyView(PublicKeySharedActivityView(proxy: proxy, publicKey: publicKeyShared.key))
        }
        return AnyView(EmptyView())
    }
}

struct ActivitiesView_Previews: PreviewProvider {
    static var previews: some View {
        ActivitiesView()
            .previewLayout(.sizeThatFits)
    }
}

struct ActivityDateView: View {
    var date: Date?
    var menu: AnyView?
    
    var body: some View {
        HStack(alignment: .center) {
            Text(date?.displayFormatted() ?? "")
                .font(Font.body)
                .fontWeight(.bold)
                .foregroundColor(Color("colorDarkGray"))
                .multilineTextAlignment(.leading)
            Spacer()
            if (menu != nil) {
                menu
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(EdgeInsets(top: 24, leading: 0, bottom: 0, trailing: 0))
        .background(.white.opacity(0.6))
    }
}

struct ActivitiesView : View {
    @Environment(\.onShareItem) var onShareItem
    @Environment(\.onSharePublicKey) var onSharePublicKey
    @Environment(\.onBundleItems) var onBundleItems
    @Environment(\.onAssetLongTapped) var onAssetLongTapped
    @Environment(\.selectedAssets) var selectedAssets: [CameraItem]
    @Environment(\.onC2PAShareItems) var onC2PAShareItems
    
    @StateObject var activitiesContainer: Activities = Activities.shared

    @State var scrollToTop: Bool = false
    @State var selectionMode: Bool = false
    @State var showShareOptions: Bool = false
    @State var showC2PAWarning: Bool = false
    @State var onCameraButton: (() -> Void)?
    @State private var showErrorAlert = false
    @State private var errorMessage = ""
    @State private var showSuccessAlert = false
    @State private var attestationResult: [String: Any] = [:]
    
    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { geometry in
                ScrollViewReader { scrollView in
                    ScrollView(.vertical, showsIndicators: false) {
                        Spacer().id("topMarker").frame(height: 1)
                        
                            HStack(alignment: .center) {
                                Text("Proof Log")
                                    .font(Font.largeTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(Color("colorDarkGray"))
                                    .multilineTextAlignment(.leading)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                    Button(action: {
                                        self.onCameraButton?()
                                    }) {
                                        Image("ic_cam_photo")
                                            .resizable()
                                            .frame(width: 32, height: 32)
                                            .foregroundColor(Color.black)
                                            .clipped()
                                    }
                                }
                            }.frame(height: 50)
                        
                        let activities = activitiesContainer.activitiesGroupedForDisplay
                        if !activitiesContainer.loaded {
                            ZStack(alignment: .center) {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                            }.frame(height: max(100, geometry.size.height - 50))
                        } else if activities.count == 0 {
                            // Nothing yet, show intro view!
                            self.emptyActivitiesView(proxy: geometry)
                        } else {
                            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
                                ForEach(activities, id: \.id) { item in
                                    Section(header: ActivityDateView(date: item.startTime,
                                                                     menu: activityMenu(activity: item)))
                                    {
                                        ActivityView(activity: item, proxy: geometry)
                                    }
                                    .onTapGesture {
                                    }
                                }
                            }
                        }
                    }
                    .onChange(of: scrollToTop) { newValue in
                        if newValue {
                            scrollView.scrollTo("topMarker", anchor: .top)
                            self.scrollToTop = false
                        }
                    }
                }
            }
            
            if selectionMode {
                HStack(alignment: .center) {
                    Text("Selected \(selectedAssets.count) items")
                        .font(Font.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(Color("colorDarkGray"))
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Spacer()
                    Button(action: {
                        showShareOptions = true
                    }) {
                        Image(systemName: "square.and.arrow.up")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 24, height: 24)
                            .foregroundColor(Color.black)
                            .clipped()
                            .padding(EdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 8))
                    }
                    Button(action: {
                        let items = Array(self.selectedAssets)
                        items.forEach { item in
                            // Deselect all
                            onAssetLongTapped?(item)
                        }
                    }) {
                        Image(systemName: "arrow.uturn.backward")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 24, height: 24)
                            .foregroundColor(Color.black)
                            .clipped()
                    }
                }.frame(height: 50)
            }
            

        }
        .padding()
        .onChange(of: selectedAssets) { selection in
            self.selectionMode = (selection.count > 0)
        }
        .confirmationDialog("", isPresented: $showShareOptions, titleVisibility: .hidden) {
            Button("Share Proof Zip") {
                withAnimation {
                    self.onBundleItems?(selectedAssets)
                }
            }
            
            Button("Add Content Credentials") {
                self.showC2PAWarning = true
            }
        }
        .confirmationDialog("Share with ProofSign cloud service to add Content Credentials (C2PA) to this photo?", isPresented: $showC2PAWarning, titleVisibility: .visible) {
            Button("OK") {
                withAnimation {
                    self.onC2PAShareItems?(selectedAssets)
                }
            }
            
            Button("Cancel", role: .cancel) {
            }
        }
        .onChange(of: Activities.shared.lastUpdated) { _ in
            self.scrollToTop = true
        }
        .alert("Workflow Error", isPresented: $showErrorAlert) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
        .alert("Attestation Created Successfully!", isPresented: $showSuccessAlert) {
            Button("View on EAS") {
                if let easUrl = attestationResult["easUrl"] as? String,
                   let url = URL(string: easUrl) {
                    UIApplication.shared.open(url)
                }
            }
            Button("Copy UID") {
                if let uid = attestationResult["attestationUID"] as? String {
                    UIPasteboard.general.string = uid
                }
            }
            Button("OK") { }
        } message: {
            VStack(alignment: .leading, spacing: 4) {
                if let uid = attestationResult["attestationUID"] as? String {
                    Text("Attestation UID: \(String(uid.prefix(10)))...")
                }
                if let location = attestationResult["location"] as? String {
                    Text("Location: \(location)")
                }
            }
        }
    }

    private func runWorkflow(zipUrl: URL, items: [CameraItem]) {
        guard let zipData = try? Data(contentsOf: zipUrl) else { 
            print("Failed to read ProofMode zip file")
            return 
        }

        var request = URLRequest(url: URL(string: "http://localhost:3000/upload")!)
        request.httpMethod = "POST"

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"proofmodeFile\"; filename=\"proofmode.zip\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/zip\r\n\r\n".data(using: .utf8)!)
        body.append(zipData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("Workflow request failed: \(error)")
                    self.errorMessage = "Network error: \(error.localizedDescription)"
                    self.showErrorAlert = true
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    print("Workflow response status: \(httpResponse.statusCode)")

                    if httpResponse.statusCode == 200, let data = data {
                        do {
                            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                                print("Workflow completed successfully!")
                                print("Attestation UID: \(json["attestationUID"] ?? "N/A")")
                                print("Location: \(json["location"] ?? "N/A")")
                                print("EAS URL: \(json["easUrl"] ?? "N/A")")
                                
                                self.attestationResult = json
                                self.showSuccessAlert = true
                            }
                        } catch {
                            print("Failed to parse response: \(error)")
                            self.errorMessage = "Failed to parse server response"
                            self.showErrorAlert = true
                        }
                    } else {
                        print("Workflow failed with status: \(httpResponse.statusCode)")
                        if let data = data, let errorMessage = String(data: data, encoding: .utf8) {
                            print("Error response: \(errorMessage)")
                        }
                        self.errorMessage = "Server returned error: \(httpResponse.statusCode)"
                        self.showErrorAlert = true
                    }
                }
            }
        }.resume()
    }
    
    private func emptyActivitiesView(proxy: GeometryProxy) -> some View {
        return ZStack(alignment: .center) {
            Text("Nothing here yet. Start capturing photos and videos!")
        }.frame(width: proxy.size.width, height: proxy.size.height)
    }
    
    private func activityMenu(activity: Activity) -> AnyView? {
        if let captured = activity.type as? ActivityTypeCaptured {
            let itemCount = captured.items.withDeletedItemsRemoved().count
            if itemCount > 0 {
                return AnyView(Menu {
                    Button("Share these \(itemCount) items", action: {
                        self.onBundleItems?(captured.items)
                    })
                } label: {
                    Label("Options", systemImage: "ellipsis").foregroundColor(.gray).labelStyle(.iconOnly).frame(width: 26, height: 32).padding(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 0)).contentShape(Rectangle())
                })
            }
        } else if let shared = activity.type as? ActivityTypeShared {
            let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent(shared.fileName)
            if url.exists {
                return AnyView(Menu {
                    Button("Re-share", action: {
                        self.onShareItem?(url, shared.items)
                    })
                    Button("Create location attestation (EAS)", action: {
                        self.runWorkflow(zipUrl: url, items: shared.items)
                    })
                } label: {
                    Label("Options", systemImage: "ellipsis").foregroundColor(.gray).labelStyle(.iconOnly).frame(width: 26, height: 32).padding(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 0)).contentShape(Rectangle())
                })
            }
        } else if let publicKeyShared = activity.type as? ActivityTypePublicKeyShared {
            return AnyView(Menu {
                Button("Re-share", action: {
                    self.onSharePublicKey?(publicKeyShared.key)
                })
            } label: {
                Label("Options", systemImage: "ellipsis").foregroundColor(.gray).labelStyle(.iconOnly).frame(width: 26, height: 32).padding(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 0)).contentShape(Rectangle())
            })
        }
        return nil
    }
}

public extension URL {
    var exists: Bool {
        (try? checkResourceIsReachable()) ?? false
    }
}

extension PHAsset: Identifiable {
    public var id: String {
        get {
            return self.localIdentifier
        }
    }
}

// From here: https://stackoverflow.com/questions/56760335/round-specific-corners-swiftui
//
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape( RoundedCorner(radius: radius, corners: corners) )
    }
}

struct RoundedCorner: Shape {
    
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

extension [CameraItem] {
    func deletedItemsString() -> String? {
        let countDeleted = self.reduce(0) { partialResult, item in
            if case .deleted = item.state {
                return partialResult + 1
            }
            return partialResult
        }
        if countDeleted > 0 {
            return String(localized: "\(countDeleted) items have been deleted or are not accessible")
        }
        return nil
    }
    
    func withDeletedItemsRemoved() -> [CameraItem] {
        return self.filter({ item in
            if case .deleted(_) = item.state { return false }
            else { return true }
        })
    }
}
