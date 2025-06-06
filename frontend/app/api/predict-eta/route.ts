import { type NextRequest, NextResponse } from "next/server"

interface PredictETARequest {
    restaurant_address: string
    delivery_address: string
    delivery_person_age: number
    delivery_person_rating: number
    vehicle_type: string
    vehicle_condition: number
    multiple_deliveries: number
    order_time: string
}

export async function POST(request: NextRequest) {
    try {
        const body: PredictETARequest = await request.json()

        // Validate required fields
        const requiredFields = [
            "restaurant_address",
            "delivery_address",
            "delivery_person_age",
            "delivery_person_rating",
            "vehicle_type",
            "vehicle_condition",
            "multiple_deliveries",
            "order_time"
        ]

        for (const field of requiredFields) {
            if (!(field in body)) {
                return NextResponse.json({ detail: `Missing required field: ${field}` }, { status: 400 })
            }
        }

        // Validate numerical fields
        if (body.delivery_person_age < 20 || body.delivery_person_age > 50) {
            return NextResponse.json({ detail: "Age must be between 20 and 50" }, { status: 400 })
        }
        if (body.delivery_person_rating < 1 || body.delivery_person_rating > 5) {
            return NextResponse.json({ detail: "Rating must be between 1 and 5" }, { status: 400 })
        }
        if (!["bicycle", "scooter", "bike"].includes(body.vehicle_type.toLowerCase())) {
            return NextResponse.json({ detail: "Invalid vehicle type" }, { status: 400 })
        }
        if (![0, 1, 2, 3].includes(body.vehicle_condition)) {
            return NextResponse.json({ detail: "Invalid vehicle condition" }, { status: 400 })
        }
        if (body.multiple_deliveries < 0 || body.multiple_deliveries > 5) {
            return NextResponse.json({ detail: "Multiple deliveries must be between 0 and 5" }, { status: 400 })
        }

        // Validate order_time
        try {
            new Date(body.order_time)
        } catch {
            return NextResponse.json({ detail: "Invalid order_time format" }, { status: 400 })
        }

        const backendUrl = process.env.BACKEND_URL || "https://zlocal.onrender.com"
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${backendUrl}/predict-eta`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("Backend Response Status:", response.status)
        if (!response.ok) {
            const errorData = await response.json()
            console.error("Backend Error:", errorData)
            return NextResponse.json({ detail: errorData.detail || `Backend error: ${response.status}` }, { status: response.status })
        }

        const data = await response.json();
        console.log("Backend Response:", data)
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in predict-eta route:", error);
        return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
    }
}