FROM eclipse-temurin:21-jdk as build
WORKDIR /workspace/app

# Copy gradle files first for better layer caching
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Make gradlew executable
RUN chmod +x ./gradlew

# Download dependencies
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src src

# Build the application
RUN ./gradlew build -x test --no-daemon

# Use JRE for runtime to reduce image size
FROM eclipse-temurin:21-jre
WORKDIR /app

# Create directory for Firebase credentials
RUN mkdir -p /app/credentials

# Copy the built jar from the build stage
COPY --from=build /workspace/app/build/libs/*.jar app.jar

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
