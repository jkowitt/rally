import AuthenticationServices
import RallyCore
import SwiftUI

// MARK: - SignInView

/// The primary sign-in screen for Rally.
///
/// Presents branded Rally UI with Sign in with Apple as the primary
/// authentication method (required by App Store guidelines), along with
/// an email fallback option for enterprise/testing accounts.
public struct SignInView: View {

    // MARK: - Properties

    @Bindable private var viewModel: AuthViewModel
    @Environment(\.colorScheme) private var colorScheme

    @State private var showEmailSignIn = false
    @State private var emailAddress = ""
    @State private var animateLogo = false

    // MARK: - Initialization

    public init(viewModel: AuthViewModel) {
        self.viewModel = viewModel
    }

    // MARK: - Body

    public var body: some View {
        ZStack {
            // Background gradient
            backgroundGradient
                .ignoresSafeArea()

            VStack(spacing: RallySpacing.xl) {
                Spacer()

                // Rally branding
                brandingSection

                Spacer()

                // Sign-in actions
                signInSection

                // Legal footer
                legalFooter
            }
            .padding(.horizontal, RallySpacing.lg)
            .padding(.bottom, RallySpacing.xl)

            // Loading overlay
            if viewModel.isLoading {
                loadingOverlay
            }
        }
        .alert("Sign In Error", isPresented: showErrorAlert) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "An unknown error occurred.")
        }
        .sheet(isPresented: $showEmailSignIn) {
            emailSignInSheet
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.0)) {
                animateLogo = true
            }
        }
    }

    // MARK: - Computed Properties

    private var showErrorAlert: Binding<Bool> {
        Binding(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )
    }

    // MARK: - Subviews

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                RallyColors.navy,
                RallyColors.navyMid,
                RallyColors.navy
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var brandingSection: some View {
        VStack(spacing: RallySpacing.md) {
            // App icon / logo
            Image(systemName: "flame.fill")
                .font(.system(size: 72, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [RallyColors.orange, RallyColors.warning],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .scaleEffect(animateLogo ? 1.0 : 0.5)
                .opacity(animateLogo ? 1.0 : 0.0)

            Text("Rally")
                .font(RallyTypography.heroTitle)
                .foregroundStyle(.white)

            Text("Your gameday companion")
                .font(RallyTypography.subtitle)
                .foregroundStyle(RallyColors.gray)
        }
    }

    private var signInSection: some View {
        VStack(spacing: RallySpacing.md) {
            // Sign in with Apple -- primary auth method
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                Task {
                    await viewModel.handleSignInWithApple(result: result)
                }
            }
            .signInWithAppleButtonStyle(
                colorScheme == .dark ? .white : .black
            )
            .frame(height: 54)
            .clipShape(RoundedRectangle(cornerRadius: RallyRadius.button))

            // Separator
            HStack {
                Rectangle()
                    .fill(RallyColors.gray.opacity(0.3))
                    .frame(height: 1)
                Text("or")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                Rectangle()
                    .fill(RallyColors.gray.opacity(0.3))
                    .frame(height: 1)
            }

            // Email fallback
            Button {
                showEmailSignIn = true
            } label: {
                HStack(spacing: RallySpacing.sm) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 16))
                    Text("Continue with Email")
                        .font(RallyTypography.buttonLabel)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: RallyRadius.button)
                        .stroke(RallyColors.gray.opacity(0.5), lineWidth: 1)
                )
            }
        }
    }

    private var legalFooter: some View {
        VStack(spacing: RallySpacing.xs) {
            Text("By continuing, you agree to Rally's")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)

            HStack(spacing: RallySpacing.xs) {
                Button("Terms of Service") {
                    // Open terms URL
                }
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.blue)

                Text("and")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)

                Button("Privacy Policy") {
                    // Open privacy URL
                }
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.blue)
            }
        }
        .multilineTextAlignment(.center)
    }

    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: RallySpacing.md) {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.2)
                Text("Signing in...")
                    .font(RallyTypography.body)
                    .foregroundStyle(.white)
            }
            .padding(RallySpacing.xl)
            .background(
                RoundedRectangle(cornerRadius: RallyRadius.card)
                    .fill(RallyColors.navyMid)
            )
        }
    }

    private var emailSignInSheet: some View {
        NavigationStack {
            VStack(spacing: RallySpacing.lg) {
                Text("Enter your school email address and we'll send you a sign-in link.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
                    .padding(.top, RallySpacing.lg)

                TextField("Email address", text: $emailAddress)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                Button {
                    // Email magic link sign-in would be implemented here.
                    showEmailSignIn = false
                } label: {
                    Text("Send Sign-In Link")
                        .font(RallyTypography.buttonLabel)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(
                            RoundedRectangle(cornerRadius: RallyRadius.button)
                                .fill(RallyColors.orange)
                        )
                }
                .disabled(emailAddress.isEmpty || !emailAddress.contains("@"))

                Spacer()
            }
            .padding(.horizontal, RallySpacing.lg)
            .navigationTitle("Email Sign In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showEmailSignIn = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Preview

#Preview("Sign In - Dark") {
    SignInView(viewModel: AuthViewModel())
        .preferredColorScheme(.dark)
}

#Preview("Sign In - Light") {
    SignInView(viewModel: AuthViewModel())
        .preferredColorScheme(.light)
}
